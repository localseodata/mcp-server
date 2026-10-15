import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateApiKey } from "./auth.js";

const mockGetAuth = (value: string) => () => value;
const mockGetAuthThrows = () => () => { throw new Error("no key"); };

describe("validateApiKey", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("rejects when getAuth throws (missing key)", async () => {
    const result = await validateApiKey(mockGetAuthThrows());
    expect(result.valid).toBe(false);
    expect(result.code).toBe("missing_key");
    expect(result.message).toContain("No API key provided");
    expect(result.message).toContain("localseodata.com/dashboard/keys");
  });

  it("rejects keys with wrong prefix", async () => {
    const result = await validateApiKey(mockGetAuth("Bearer not_a_real_key"));
    expect(result.valid).toBe(false);
    expect(result.code).toBe("bad_key_format");
    expect(result.message).toContain("sk_live_");
    expect(result.message).toContain("sk_test_");
  });

  it("accepts valid sk_live_ key when API returns 200", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    const result = await validateApiKey(mockGetAuth("Bearer sk_live_validkey123"));
    expect(result.valid).toBe(true);
  });

  it("accepts valid sk_test_ key when API returns 200", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    const result = await validateApiKey(mockGetAuth("Bearer sk_test_sandboxkey"));
    expect(result.valid).toBe(true);
  });

  it("rejects on 401 (invalid/revoked key)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "invalid_api_key" } }), { status: 401 })
    );
    const result = await validateApiKey(mockGetAuth("Bearer sk_live_revoked"));
    expect(result.valid).toBe(false);
    expect(result.code).toBe("invalid_api_key");
    expect(result.message).toContain("invalid or has been revoked");
    expect(result.message).toContain("localseodata.com/dashboard/keys");
  });

  it("rejects on 403 with email_not_verified", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "email_not_verified" } }), { status: 403 })
    );
    const result = await validateApiKey(mockGetAuth("Bearer sk_live_unverified"));
    expect(result.valid).toBe(false);
    expect(result.code).toBe("email_not_verified");
    expect(result.message).toContain("email isn't verified");
    expect(result.message).toContain("localseodata.com/dashboard");
  });

  it("rejects on other HTTP errors", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("server error", { status: 500 })
    );
    const result = await validateApiKey(mockGetAuth("Bearer sk_live_serverdown"));
    expect(result.valid).toBe(false);
    expect(result.code).toBe("auth_failed");
    expect(result.message).toContain("500");
  });

  it("fails closed on network error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const result = await validateApiKey(mockGetAuth("Bearer sk_live_netfail"));
    expect(result.valid).toBe(false);
    expect(result.code).toBe("service_unavailable");
    expect(result.message).toContain("Try reconnecting");
  });

  it("fails closed on timeout", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError"));
    const result = await validateApiKey(mockGetAuth("Bearer sk_live_timeout"));
    expect(result.valid).toBe(false);
    expect(result.code).toBe("service_unavailable");
  });

  it("handles 401 with non-JSON response body", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("Unauthorized", { status: 401 })
    );
    const result = await validateApiKey(mockGetAuth("Bearer sk_live_badbody"));
    expect(result.valid).toBe(false);
    expect(result.code).toBe("invalid_api_key");
  });

  it("passes auth header to fetch", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    globalThis.fetch = mockFetch;
    await validateApiKey(mockGetAuth("Bearer sk_live_checkheader"));
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/account/balance"),
      expect.objectContaining({
        headers: { Authorization: "Bearer sk_live_checkheader" },
      })
    );
  });
});
