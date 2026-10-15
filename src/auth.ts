import { env, DASHBOARD_URL, MISSING_KEY_MESSAGE, internalApiHeaders } from "./config.js";

export interface AuthResult {
  valid: boolean;
  code?: string;
  message: string;
}

/** API keys have a fixed prefix; with OAuth on, any other bearer is an OAuth access token. */
export function isApiKey(token: string): boolean {
  return token.startsWith("sk_live_") || token.startsWith("sk_test_");
}

/**
 * Whether a bearer token is a well-formed OAuth access token that has not yet
 * expired. Only the expiry is read here — the signature, audience and
 * revocation are checked by the API on every call. This lets the server send
 * an HTTP 401 the moment a token lapses, which is what makes MCP clients
 * refresh it; an error inside a 200 JSON-RPC reply would not.
 */
export function isUnexpiredAccessToken(token: string, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return typeof payload?.exp === "number" && payload.exp > nowSeconds;
  } catch {
    return false;
  }
}

/**
 * The challenge that starts (or restarts) OAuth in an MCP client: it points
 * at our protected-resource metadata, which names the authorization server.
 */
export function wwwAuthenticate(error?: "invalid_token"): string {
  const resourceMetadata = `${new URL(env.MCP_RESOURCE_URL).origin}/.well-known/oauth-protected-resource`;
  const params = [`resource_metadata="${resourceMetadata}"`];
  if (error) params.push(`error="${error}"`, `error_description="The access token is invalid or expired"`);
  return `Bearer ${params.join(", ")}`;
}

/**
 * With OAuth on, the WWW-Authenticate challenge to answer with (as an HTTP
 * 401) when there is no credential at all, or when an OAuth access token has
 * expired. That status is what makes an MCP client start sign-in or refresh
 * its token. API keys are never challenged; their errors stay as before.
 * Returns null when the request should go ahead.
 */
export function oauthChallenge(requestUrl: string, authorization: string | undefined): string | null {
  if (!env.OAUTH_ENABLED) return null;
  if (new URL(requestUrl, "http://localhost").searchParams.get("key")) return null;
  const header = authorization ?? "";
  if (!header.startsWith("Bearer ")) return wwwAuthenticate();
  const token = header.slice(7);
  if (isApiKey(token) || isUnexpiredAccessToken(token)) return null;
  return wwwAuthenticate("invalid_token");
}

/** RFC 9728 protected resource metadata for /mcp. */
export function protectedResourceMetadata() {
  return {
    resource: env.MCP_RESOURCE_URL,
    authorization_servers: [env.OAUTH_ISSUER],
    scopes_supported: ["openid", "profile", "email", "offline_access"],
    bearer_methods_supported: ["header"],
    resource_name: "Local SEO Data",
    resource_documentation: "https://localseodata.com/docs",
  };
}

export async function validateApiKey(getAuth: () => string): Promise<AuthResult> {
  let authHeader: string;
  try {
    authHeader = getAuth();
  } catch {
    return {
      valid: false,
      code: "missing_key",
      message: MISSING_KEY_MESSAGE,
    };
  }

  const rawKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  const isAccessToken = env.OAUTH_ENABLED && !isApiKey(rawKey);

  if (!isAccessToken && !isApiKey(rawKey)) {
    return {
      valid: false,
      code: "bad_key_format",
      message: `That doesn't look like a Local SEO Data API key. Keys start with sk_live_ or sk_test_ — get yours at ${DASHBOARD_URL}/keys`,
    };
  }

  try {
    const res = await fetch(`${env.API_BASE_URL}/v1/account/balance`, {
      method: "GET",
      headers: { Authorization: authHeader, ...internalApiHeaders() },
      signal: AbortSignal.timeout(10_000),
    });

    if (res.ok) {
      return { valid: true, message: "OK" };
    }

    const text = await res.text();
    let parsed: any;
    try { parsed = JSON.parse(text); } catch {}
    const code = parsed?.error?.code;

    if (res.status === 401 && isAccessToken) {
      return {
        valid: false,
        code: "invalid_token",
        message: "Your Local SEO Data connection has expired or was disconnected. Reconnect the app to continue.",
      };
    }

    if (res.status === 401) {
      return {
        valid: false,
        code: code ?? "invalid_api_key",
        message: `Your API key is invalid or has been revoked. Get a new one at ${DASHBOARD_URL}/keys`,
      };
    }

    if (res.status === 403 && code === "email_not_verified") {
      return {
        valid: false,
        code: "email_not_verified",
        message: `Your email isn't verified yet. Check your inbox for the verification link, or resend it from ${DASHBOARD_URL}`,
      };
    }

    return {
      valid: false,
      code: code ?? "auth_failed",
      message: `Could not validate your API key (${res.status}). Check your key at ${DASHBOARD_URL}/keys`,
    };
  } catch (err) {
    console.error("[auth] Validation request failed:", err);
    return {
      valid: false,
      code: "service_unavailable",
      message: "Couldn't reach Local SEO Data servers right now. Try reconnecting in a moment.",
    };
  }
}
