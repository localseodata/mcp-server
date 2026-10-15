import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./server.js";
import { env, MISSING_KEY_MESSAGE } from "./config.js";
import {
  validateApiKey,
  oauthChallenge,
  protectedResourceMetadata,
  wwwAuthenticate,
} from "./auth.js";

// ─── CORS origins shared by both Hono and the raw MCP handler ───────────────

const ALLOWED_ORIGINS = [
  // OpenAI: ChatGPT apps/connectors, and the Platform's plugin submission scan.
  "https://chatgpt.com",
  "https://chat.openai.com",
  "https://platform.openai.com",
  "https://claude.ai",
  "https://www.claude.ai",
  "https://claude.com",
  "https://www.anthropic.com",
  "https://api.anthropic.com",
];

// Browsers send an Origin header; non-browser MCP clients (Claude connectors,
// CLI clients, the MCP Inspector proxy) typically send none. We only reject a
// request that carries an Origin that isn't trusted — the DNS-rebinding / CSRF
// guard the connector review asks for — while leaving header-less clients and
// localhost tooling untouched.
function isOriginAllowed(origin: string): boolean {
  if (!origin) return true; // no Origin → not a browser cross-origin request
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
  } catch {
    // Malformed Origin — fall through to rejection.
  }
  return false;
}

// ─── Hono app — handles non-MCP routes ──────────────────────────────────────

const app = new Hono();

app.use(
  "/*",
  cors({
    origin: ALLOWED_ORIGINS,
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Mcp-Session-Id"],
    exposeHeaders: ["Mcp-Session-Id"],
    credentials: true,
  })
);

// Health check
app.get("/health", (c) => c.json({ status: "ok", service: "mcp-server" }));

// OpenAI plugin submission: domain verification. The portal asks for the
// exact token as plain text at this path on the MCP host.
app.get("/.well-known/openai-apps-challenge", (c) => {
  const token = env.OPENAI_APPS_CHALLENGE.trim();
  if (!token) return c.text("Not found", 404);
  return c.text(token);
});

// OAuth protected resource metadata (RFC 9728): tells MCP clients which
// authorization server issues tokens for /mcp. Served at the root path and
// the path-suffixed form clients derive from the resource URL.
for (const path of ["/.well-known/oauth-protected-resource", "/.well-known/oauth-protected-resource/mcp"]) {
  app.get(path, (c) => {
    if (!env.OAUTH_ENABLED) return c.json({ error: "Not found" }, 404);
    c.header("Access-Control-Allow-Origin", "*");
    c.header("Cache-Control", "public, max-age=300");
    return c.json(protectedResourceMetadata());
  });
}

// ─── Raw MCP handler — all /mcp methods go through the SDK transport ────────

function setCorsHeaders(req: IncomingMessage, res: ServerResponse) {
  const origin = req.headers.origin ?? "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Mcp-Session-Id"
    );
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
  }
}

function extractAuth(req: IncomingMessage): () => string {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const queryKey = url.searchParams.get("key") ?? "";
  const authHeader = req.headers.authorization ?? "";

  return () => {
    if (queryKey) return `Bearer ${queryKey}`;
    if (authHeader.startsWith("Bearer ")) return authHeader;
    throw new Error(MISSING_KEY_MESSAGE);
  };
}

// Redacted key identifier for logs — enough to match a support request to a
// key without ever logging the key itself.
function describeAuth(getAuth: () => string): string {
  let key: string;
  try {
    key = getAuth().replace(/^Bearer /, "");
  } catch {
    return "no key";
  }
  if (key.length <= 16) return `key ${key.slice(0, 8)}… (len ${key.length})`;
  return `key ${key.slice(0, 12)}…${key.slice(-4)} (len ${key.length})`;
}

function sendUnauthorized(res: ServerResponse, challenge: string, message: string, id: unknown = null) {
  res.writeHead(401, {
    "Content-Type": "application/json",
    "WWW-Authenticate": challenge,
    "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
  });
  res.end(JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32001, message } }));
}

/**
 * The SDK answers 406 to a POST whose Accept header doesn't list both
 * application/json and text/event-stream. Replies here are always plain JSON
 * (enableJsonResponse), so a client that only asks for JSON — or sends no
 * Accept at all — loses nothing; let it through rather than fail discovery.
 * The SDK reads rawHeaders, so that's what is rewritten.
 */
function acceptJsonAndSse(req: IncomingMessage) {
  if (req.method !== "POST") return;
  const accept = String(req.headers.accept ?? "");
  if (accept.includes("application/json") && accept.includes("text/event-stream")) return;
  const value = "application/json, text/event-stream";
  const i = req.rawHeaders.findIndex((h, idx) => idx % 2 === 0 && h.toLowerCase() === "accept");
  if (i >= 0) req.rawHeaders[i + 1] = value;
  else req.rawHeaders.push("Accept", value);
  req.headers.accept = value;
}

async function handleMcpRequest(req: IncomingMessage, res: ServerResponse) {
  setCorsHeaders(req, res);

  const method = req.method ?? "GET";
  console.log(`[mcp] ${method} ${(req.url ?? "/").split("?")[0]} (origin: ${req.headers.origin ?? "none"}, session: ${req.headers["mcp-session-id"] ?? "none"}, accept: ${req.headers.accept ?? "none"}, auth: ${req.headers.authorization ? "bearer" : new URL(req.url ?? "/", "http://x").searchParams.has("key") ? "query key" : "none"})`);
  acceptJsonAndSse(req);

  // Reject untrusted browser origins before doing any work (DNS-rebinding / CSRF
  // guard). Header-less and localhost clients pass through unaffected.
  const origin = req.headers.origin ?? "";
  if (!isOriginAllowed(origin)) {
    console.log(`[mcp] Origin rejected: ${origin}`);
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32600, message: "Origin not allowed" },
    }));
    return;
  }

  const challenge = oauthChallenge(req.url ?? "/", req.headers.authorization);
  if (challenge) {
    console.log(`[mcp] OAuth challenge (${challenge.includes("invalid_token") ? "expired or malformed token" : "no credential"})`);
    sendUnauthorized(res, challenge, "Authentication required. Connect your Local SEO Data account, or add an API key.");
    return;
  }

  const getAuth = extractAuth(req);

  let body: unknown = undefined;
  if (method === "POST") {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const raw = Buffer.concat(chunks).toString();
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error: Invalid JSON" },
        }));
        return;
      }
    }
  }

  if (method === "POST" && body && isInitializeRequest(body)) {
    const authResult = await validateApiKey(getAuth);
    if (!authResult.valid) {
      console.log(`[mcp] Auth rejected on initialize: ${authResult.code} (${describeAuth(getAuth)})`);
      const id = Array.isArray(body)
        ? (body.find((m: any) => m.method === "initialize") as any)?.id ?? null
        : (body as any).id ?? null;
      if (authResult.code === "invalid_token") {
        sendUnauthorized(res, wwwAuthenticate("invalid_token"), authResult.message, id);
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        jsonrpc: "2.0",
        id,
        error: { code: -32001, message: authResult.message },
      }));
      return;
    }
  }

  const server = createMcpServer(getAuth);

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true,
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, body);
}

function isInitializeRequest(body: unknown): boolean {
  if (Array.isArray(body)) {
    return body.some((msg: any) => msg.method === "initialize");
  }
  return (body as any)?.method === "initialize";
}

// ─── HTTP server — routes /mcp to raw handler, rest to Hono ─────────────────

const server = createServer(async (req, res) => {
  const url = req.url ?? "/";

  // The MCP endpoint is /mcp. The bare origin is accepted too: clients that
  // are given https://mcp.localseodata.com still find OAuth (its metadata is
  // at the root), and would otherwise fail every call after sign-in.
  const pathname = url.split("?")[0];
  const isMcp = pathname.startsWith("/mcp") || pathname === "/";

  // Handle CORS preflight for /mcp
  if (req.method === "OPTIONS" && isMcp) {
    setCorsHeaders(req, res);
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, DELETE, OPTIONS"
    );
    res.writeHead(204);
    res.end();
    return;
  }

  // ALL /mcp methods — raw handler (SDK transport owns the response)
  if (isMcp) {
    try {
      await handleMcpRequest(req, res);
    } catch (err) {
      console.error("MCP handler error:", err);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
    }
    return;
  }

  // Everything else — Hono
  const response = await app.fetch(
    new Request(`http://localhost${url}`, {
      method: req.method,
      headers: req.headers as Record<string, string>,
    })
  );

  if (response.status === 404) {
    console.log(`[http] 404 ${req.method} ${pathname} (origin: ${req.headers.origin ?? "none"})`);
  }

  res.writeHead(response.status, Object.fromEntries(response.headers));
  const body = await response.arrayBuffer();
  res.end(Buffer.from(body));
});

server.listen(env.PORT, () => {
  console.log(`LocalSEOData MCP server running on port ${env.PORT}`);
  console.log(`MCP endpoint: http://localhost:${env.PORT}/mcp`);
  console.log(`Health check: GET http://localhost:${env.PORT}/health`);
});
