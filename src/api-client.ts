import { env } from "./config.js";

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

export async function callApi(
  path: string,
  body: Record<string, unknown>,
  authHeader: string,
  timeoutMs = 60_000
): Promise<{ data: unknown; credits_used: number; credits_remaining: number; cached: boolean }> {
  const url = `${env.API_BASE_URL}${path}`;

  console.log(`[api] POST ${url} (timeout: ${timeoutMs / 1000}s, auth: ${authHeader ? `${authHeader.slice(0, 15)}...` : "MISSING"})`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[api] ${response.status} ${response.statusText} from ${path}: ${text.slice(0, 200)}`);
    // Try to parse as structured error
    try {
      const result = JSON.parse(text) as ApiErrorResponse;
      if (result.status === "error") {
        const err = result.error;
        const reqId = result.request_id ? ` [request_id: ${result.request_id}]` : "";
        throw new Error(
          err.required_credits
            ? `${err.message} (requires ${err.required_credits} credits, balance: ${err.current_balance})${reqId}`
            : `${err.message}${reqId}`
        );
      }
    } catch (parseErr) {
      if (parseErr instanceof Error && parseErr.message !== "error") {
        // Re-throw if it's our structured error from above
        if (!text.includes('"status":"error"')) {
          throw new Error(`API returned ${response.status}: ${text.slice(0, 200)}`);
        }
        throw parseErr;
      }
    }
    throw new Error(`API returned ${response.status}: ${text.slice(0, 200)}`);
  }

  const result = (await response.json()) as ApiResponse;

  if (result.status === "error") {
    const err = (result as ApiErrorResponse).error;
    const reqId = (result as ApiErrorResponse).request_id ? ` [request_id: ${(result as ApiErrorResponse).request_id}]` : "";
    throw new Error(
      err.required_credits
        ? `${err.message} (requires ${err.required_credits} credits, balance: ${err.current_balance})${reqId}`
        : `${err.message}${reqId}`
    );
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
    },
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[api] ${response.status} ${response.statusText} from ${path}: ${text.slice(0, 200)}`);
    throw new Error(`API returned ${response.status}: ${text.slice(0, 200)}`);
  }

  const result = (await response.json()) as ApiResponse;

  if (result.status === "error") {
    throw new Error(result.error.message);
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

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

/** Wrap an MCP tool handler so thrown errors always surface as MCP error content */
export function withErrorHandling<T>(
  fn: (args: T) => Promise<ToolResult>
): (args: T) => Promise<ToolResult> {
  return async (args) => {
    try {
      return await fn(args);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[mcp] Tool error: ${message}`);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  };
}
