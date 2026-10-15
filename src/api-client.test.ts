import { describe, it, expect, vi, afterEach } from "vitest";
import { callApi, withErrorHandling } from "./api-client.js";

function apiError(code: string, message: string, requestId?: string) {
  const suffix = requestId ? ` [request_id: ${requestId}]` : "";
  const err = new Error(`${message}${suffix}`);
  (err as any).code = code;
  return err;
}

async function run(err: Error) {
  const handler = withErrorHandling(async () => {
    throw err;
  });
  return handler({});
}

describe("withErrorHandling", () => {
  it("keeps the request_id when a canned rewrite replaces the message", async () => {
    // Regression: the upstream_error rewrite discarded the API's message
    // wholesale, so users couldn't report a request_id for exactly the
    // failure mode support needs traces for.
    const result = await run(
      apiError("upstream_error", "The search could not be completed: boom", "req_abc123")
    );
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("temporarily unavailable");
    expect(result.content[0].text).toContain("[request_id: req_abc123]");
  });

  it("keeps the request_id on no_results rewrites", async () => {
    const result = await run(
      apiError("no_results", "No data available for this query", "req_def456")
    );
    expect(result.content[0].text).toContain("[request_id: req_def456]");
  });

  it("does not duplicate the request_id on passthrough rewrites", async () => {
    const result = await run(
      apiError("upstream_input_rejected", "location not found", "req_ghi789")
    );
    const matches = result.content[0].text.match(/req_ghi789/g);
    expect(matches).toHaveLength(1);
  });

  it("handles errors without a request_id", async () => {
    const result = await run(apiError("upstream_error", "boom"));
    expect(result.content[0].text).toBe(
      "This tool's search is temporarily unavailable — other tools may be unaffected. Try again in a minute."
    );
  });

  it("handles unknown error codes verbatim", async () => {
    const result = await run(apiError("some_new_code", "detailed message", "req_jkl012"));
    expect(result.content[0].text).toContain("detailed message");
    expect(result.content[0].text).toContain("req_jkl012");
  });
});

describe("callApi errors that don't come from our API", () => {
  afterEach(() => vi.unstubAllGlobals());

  function respond(status: number, body: string) {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  }

  it("turns the hosting edge's 502 into a retry message instead of crashing on its body", async () => {
    // The body the hosting edge returns when the API doesn't answer: it has
    // status "error" but no `error` object, which used to throw
    // "Cannot read properties of undefined (reading 'required_credits')".
    respond(502, JSON.stringify({
      status: "error", code: 502, message: "Application failed to respond", request_id: "7lK-SuMMSmaklOcm6WHkDg",
    }));
    const result = await withErrorHandling(() => callApi("/v1/reviews/google", {}, "Bearer sk_live_x") as never)({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Local SEO Data didn't respond (it may be restarting). Try again in a minute.");
  });

  it("still reports our API's structured errors", async () => {
    respond(402, JSON.stringify({
      status: "error", request_id: "req_1",
      error: { code: "insufficient_credits", message: "Insufficient credits", required_credits: 5, current_balance: 2 },
    }));
    const result = await withErrorHandling(() => callApi("/v1/business/profile", {}, "Bearer sk_live_x") as never)({});
    expect(result.content[0].text).toContain("need 5, have 2");
    expect(result.content[0].text).toContain("[request_id: req_1]");
  });

  it("keeps the status and body for other non-API errors", async () => {
    respond(500, "<html>oops</html>");
    const result = await withErrorHandling(() => callApi("/v1/maps", {}, "Bearer sk_live_x") as never)({});
    expect(result.content[0].text).toBe("Error: API returned 500: <html>oops</html>");
  });
});
