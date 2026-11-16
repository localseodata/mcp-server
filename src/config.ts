import { AsyncLocalStorage } from "node:async_hooks";
import { MCP_SERVER_VERSION } from "./version.js";

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
  // same either way. See docs/OAUTH-MCP-DESIGN.md.
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
/** The focused toolset serving the current request, if any (see index.ts). */
export const requestToolset = new AsyncLocalStorage<string | undefined>();

export function internalApiHeaders(): Record<string, string> {
  // The API logs the user agent with each request, so calls made through a
  // focused server can be counted per toolset. Stdio sets the toolset by env.
  const toolset = requestToolset.getStore() ?? process.env.LOCALSEODATA_TOOLSET;
  const headers: Record<string, string> = {
    "User-Agent": `localseodata-mcp/${MCP_SERVER_VERSION}${toolset ? ` (${toolset})` : ""}`,
  };
  if (env.MCP_SERVER_SECRET) headers["X-MCP-Server-Secret"] = env.MCP_SERVER_SECRET;
  return headers;
}

export const DASHBOARD_URL = "https://localseodata.com/dashboard";
/** Links in tool and auth messages arrive with no referrer (a terminal, an
 *  agent's chat), so they carry their own source for signup attribution. A
 *  focused server adds its toolset as the campaign. */
function utm(): string {
  const toolset = requestToolset.getStore() ?? process.env.LOCALSEODATA_TOOLSET;
  return `utm_source=mcp&utm_medium=message${toolset ? `&utm_campaign=${toolset}` : ""}`;
}
export const keysUrl = () => `${DASHBOARD_URL}/keys?${utm()}`;
export const dashboardLink = () => `${DASHBOARD_URL}?${utm()}`;

export function missingKeyMessage(): string {
  const toolset = requestToolset.getStore();
  const path = toolset ? `${toolset}/mcp` : "mcp";
  return `No API key provided. Add your key to the URL like: mcp.localseodata.com/${path}?key=sk_live_xxx — get yours at ${keysUrl()}`;
}
