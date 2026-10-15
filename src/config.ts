function getEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  API_BASE_URL: getEnv("API_BASE_URL", "https://api.localseodata.com"),
  PORT: parseInt(getEnv("PORT", "3003"), 10),
  // OAuth for MCP clients that connect with a "Connect" button (ChatGPT apps,
  // Claude.ai connectors). Must match the API's settings. API keys work the
  // same either way.
  OAUTH_ENABLED: getEnv("OAUTH_ENABLED", "false") === "true",
  OAUTH_ISSUER: getEnv("OAUTH_ISSUER", "https://localseodata.com"),
  MCP_RESOURCE_URL: getEnv("MCP_RESOURCE_URL", "https://mcp.localseodata.com/mcp"),
  // Sent on every API call; lets the API accept OAuth tokens from us only.
  MCP_SERVER_SECRET: getEnv("MCP_SERVER_SECRET", ""),
  // Token from the OpenAI Platform's "Connect MCP server" domain-verification
  // step, served as plain text at /.well-known/openai-apps-challenge. Not a
  // secret; unset means the route returns 404.
  OPENAI_APPS_CHALLENGE: getEnv("OPENAI_APPS_CHALLENGE", ""),
} as const;

/** Headers added to every call this server makes to the API. */
export function internalApiHeaders(): Record<string, string> {
  return env.MCP_SERVER_SECRET ? { "X-MCP-Server-Secret": env.MCP_SERVER_SECRET } : {};
}

export const DASHBOARD_URL = "https://localseodata.com/dashboard";

export const MISSING_KEY_MESSAGE = `No API key provided. Add your key to the URL like: mcp.localseodata.com/mcp?key=sk_live_xxx — get yours at ${DASHBOARD_URL}/keys`;
