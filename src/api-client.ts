import { env, DASHBOARD_URL, internalApiHeaders } from "./config.js";

interface ApiSuccessResponse {
  status: "success";
  request_id: string;
  credits_used: number;
  credits_remaining: number;
  cached: boolean;
  data: unknown;
}

interface ApiErrorResponse {
  status: "error";
  request_id: string;
  error: {
    code: string;
    message: string;
    required_credits?: number;
    current_balance?: number;
  };
}

type ApiResponse = ApiSuccessResponse | ApiErrorResponse;

function throwStructuredError(response: ApiErrorResponse): never {
  const err = response.error;
  const reqId = response.request_id ? ` [request_id: ${response.request_id}]` : "";
  const msg = err.required_credits
    ? `${err.message} (requires ${err.required_credits} credits, balance: ${err.current_balance})${reqId}`
    : `${err.message}${reqId}`;
  const tagged = new Error(msg);
  (tagged as any).code = err.code;
  throw tagged;
}

function parseAndThrowApiError(status: number, text: string): never {
  let parsed: ApiErrorResponse | null = null;
  try { parsed = JSON.parse(text) as ApiErrorResponse; } catch {}
  // Only our API's errors carry an `error` object. The hosting edge answers a
  // down or restarting service with its own body ({status: "error", code:
  // 502, message: "Application failed to respond"}), which has none.
  if (parsed?.status === "error" && parsed.error && typeof parsed.error === "object") {
    throwStructuredError(parsed);
  }
  const err = new Error(`API returned ${status}: ${text.slice(0, 200)}`);
  if (status === 502 || status === 503 || status === 504) (err as any).code = "service_unavailable";
  throw err;
}

export async function callApi(
  path: string,
  body: Record<string, unknown>,
  authHeader: string,
  // Report endpoints are composite (several searches per call) and the API
  // gives slow searches up to 120s before failing — wait long enough
  // to receive that answer (or its request_id-bearing error) instead of
  // hanging up first. Platform-side tool-call limits may still cut in
  // earlier for some AI clients; that ceiling isn't ours.
  timeoutMs = 150_000
): Promise<{ data: unknown; credits_used: number; credits_remaining: number; cached: boolean }> {
  const url = `${env.API_BASE_URL}${path}`;

  console.log(`[api] POST ${url} (timeout: ${timeoutMs / 1000}s, auth: ${authHeader ? `${authHeader.slice(0, 15)}...` : "MISSING"})`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
      ...internalApiHeaders(),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[api] ${response.status} ${response.statusText} from ${path}: ${text.slice(0, 200)}`);
    parseAndThrowApiError(response.status, text);
  }

  const result = (await response.json()) as ApiResponse;

  if (result.status === "error") {
    throwStructuredError(result as ApiErrorResponse);
  }

  console.log(`[api] ${path} OK (${result.credits_used} credits used, ${result.credits_remaining} remaining)`);

  return {
    data: result.data,
    credits_used: result.credits_used,
    credits_remaining: result.credits_remaining,
    cached: result.cached,
  };
}

export async function callApiGet(
  path: string,
  authHeader: string
): Promise<{ data: unknown; credits_used: number; credits_remaining: number; cached: boolean }> {
  const url = `${env.API_BASE_URL}${path}`;

  console.log(`[api] GET ${url} (auth: ${authHeader ? `${authHeader.slice(0, 15)}...` : "MISSING"})`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: authHeader,
      ...internalApiHeaders(),
    },
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[api] ${response.status} ${response.statusText} from ${path}: ${text.slice(0, 200)}`);
    parseAndThrowApiError(response.status, text);
  }

  const result = (await response.json()) as ApiResponse;

  if (result.status === "error") {
    throwStructuredError(result as ApiErrorResponse);
  }

  console.log(`[api] ${path} OK (${result.credits_used} credits used, ${result.credits_remaining} remaining)`);

  return {
    data: result.data,
    credits_used: result.credits_used,
    credits_remaining: result.credits_remaining,
    cached: result.cached,
  };
}

export function formatResult(
  data: unknown,
  meta: { credits_used: number; credits_remaining: number; cached: boolean }
): string {
  const metaLine = `[${meta.credits_used} credit${meta.credits_used !== 1 ? "s" : ""} used | ${meta.credits_remaining} remaining${meta.cached ? " | cached" : ""}]`;
  return `${metaLine}\n\n${JSON.stringify(data, null, 2)}`;
}

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean; structuredContent?: Record<string, unknown> };

const ERROR_MESSAGES: Record<string, (original: string) => string> = {
  insufficient_credits: (msg) => {
    const credits = msg.match(/requires (\d+) credits, balance: (\d+)/);
    return credits
      ? `Not enough credits (need ${credits[1]}, have ${credits[2]}). Add more at ${DASHBOARD_URL}/billing`
      : `Not enough credits. Check your balance and add more at ${DASHBOARD_URL}/billing`;
  },
  invalid_params: (msg) => `Invalid input: ${msg}. Check the tool description for the right format.`,
  no_results: () => "No results found. Try a different keyword or use the location_search tool to check the location format.",
  rate_limited: () => "Too many requests. Wait a moment and try again.",
  service_unavailable: () => "Local SEO Data didn't respond (it may be restarting). Try again in a minute.",
  invalid_api_key: () => `Your API key is invalid or has been revoked. Get a new one at ${DASHBOARD_URL}/keys`,
  expired_api_key: () => `Your API key expired. Get a new one at ${DASHBOARD_URL}/keys`,
  email_not_verified: () => `Your email isn't verified yet. Check your inbox for the verification link, or resend it from ${DASHBOARD_URL}`,
  business_not_found: () => "Business not found on Google. Make sure the name matches exactly how it appears on Google Maps.",
  // "The service is down" overclaims — each tool runs its own kind of
  // search, and one family can be degraded while every other tool
  // works fine (which reads as "the error is lying" to anyone who checks).
  upstream_error: () =>
    "This tool's search is temporarily unavailable — other tools may be unaffected. Try again in a minute.",
  // Pass the server's message through verbatim — the API crafts specific,
  // actionable copy for this class (unresolvable locations, empty keywords,
  // malformed domains). The old canned "make sure URLs and domains are
  // valid" replacement blamed URLs for geo failures.
  upstream_input_rejected: (msg) => msg,
};

export function withErrorHandling<T>(
  fn: (args: T) => Promise<ToolResult>
): (args: T) => Promise<ToolResult> {
  return async (args) => {
    try {
      return await fn(args);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const code = (err as any)?.code as string | undefined;
      const rewrite = code ? ERROR_MESSAGES[code] : undefined;
      let text = rewrite ? rewrite(message) : `Error: ${message}`;
      // Canned rewrites replace the API's message wholesale, which dropped
      // the "[request_id: …]" suffix the API appends — leaving support with
      // no trace for exactly the failure modes (upstream_error, no_results)
      // they most need traces for. Re-attach it whenever a rewrite lost it.
      const reqId = message.match(/\[request_id: [^\]]+\]/);
      if (reqId && !text.includes(reqId[0])) text = `${text} ${reqId[0]}`;
      console.error(`[mcp] Tool error (${code || "unknown"}): ${message}`);
      return {
        content: [{ type: "text" as const, text }],
        isError: true,
      };
    }
  };
}
