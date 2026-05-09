import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./server.js";
import { env } from "./config.js";

// ─── CORS origins shared by both Hono and the raw MCP handler ───────────────

const ALLOWED_ORIGINS = [
  "https://claude.ai",
  "https://www.claude.ai",
  "https://claude.com",
  "https://www.anthropic.com",
  "https://api.anthropic.com",
];

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
    throw new Error(
      "Missing API key. Add ?key=sk_live_xxx to the URL or use Authorization: Bearer sk_live_xxx"
    );
  };
}

async function handleMcpRequest(req: IncomingMessage, res: ServerResponse) {
  setCorsHeaders(req, res);

  const method = req.method ?? "GET";
  console.log(`[mcp] ${method} /mcp (origin: ${req.headers.origin ?? "none"}, session: ${req.headers["mcp-session-id"] ?? "none"})`);

  const getAuth = extractAuth(req);
  const server = createMcpServer(getAuth);

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true,
  });

  await server.connect(transport);

  // Read body for POST, pass undefined for GET/DELETE
  let body: unknown = undefined;
  if (method === "POST") {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const raw = Buffer.concat(chunks).toString();
    if (raw) {
      body = JSON.parse(raw);
    }
  }

  await transport.handleRequest(req, res, body);
}

// ─── HTTP server — routes /mcp to raw handler, rest to Hono ─────────────────

const server = createServer(async (req, res) => {
  const url = req.url ?? "/";

  // Handle CORS preflight for /mcp
  if (req.method === "OPTIONS" && url.startsWith("/mcp")) {
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
  if (url.startsWith("/mcp")) {
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

  res.writeHead(response.status, Object.fromEntries(response.headers));
  const body = await response.arrayBuffer();
  res.end(Buffer.from(body));
});

server.listen(env.PORT, () => {
  console.log(`LocalSEOData MCP server running on port ${env.PORT}`);
  console.log(`MCP endpoint: http://localhost:${env.PORT}/mcp`);
  console.log(`Health check: GET http://localhost:${env.PORT}/health`);
});
