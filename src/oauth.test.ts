import { describe, it, expect, vi, afterEach } from "vitest";

// OAuth on, as in production. config.ts reads these at import.
process.env.OAUTH_ENABLED = "true";
process.env.OAUTH_ISSUER = "https://localseodata.test";
process.env.MCP_RESOURCE_URL = "https://mcp.localseodata.test/mcp";
process.env.MCP_SERVER_SECRET = "mcp-server-secret-for-tests";

const { oauthChallenge, isUnexpiredAccessToken, protectedResourceMetadata, validateApiKey, wwwAuthenticate } =
  await import("./auth.js");

const now = Math.floor(Date.now() / 1000);
function jwt(payload: Record<string, unknown>): string {
  const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${enc({ alg: "EdDSA", kid: "k" })}.${enc(payload)}.signature`;
}
const live = jwt({ sub: "user-1", exp: now + 600 });
const expired = jwt({ sub: "user-1", exp: now - 1 });

const RESOURCE_METADATA = 'resource_metadata="https://mcp.localseodata.test/.well-known/oauth-protected-resource"';

describe("oauthChallenge", () => {
  it("challenges a request with no credential, pointing at the resource metadata", () => {
    const challenge = oauthChallenge("/mcp", undefined);
    expect(challenge).toBe(`Bearer ${RESOURCE_METADATA}`);
  });

  it("challenges an expired access token with invalid_token so the client refreshes", () => {
    const challenge = oauthChallenge("/mcp", `Bearer ${expired}`);
    expect(challenge).toContain(RESOURCE_METADATA);
    expect(challenge).toContain('error="invalid_token"');
  });

  it("challenges something that is neither a key nor a token", () => {
    expect(oauthChallenge("/mcp", "Bearer whatever")).toContain('error="invalid_token"');
  });

  it("lets an unexpired access token through (the API verifies it)", () => {
    expect(oauthChallenge("/mcp", `Bearer ${live}`)).toBeNull();
  });

  it("never challenges API keys, in the header or the URL", () => {
    expect(oauthChallenge("/mcp", "Bearer sk_live_abc")).toBeNull();
    expect(oauthChallenge("/mcp", "Bearer sk_test_abc")).toBeNull();
    expect(oauthChallenge("/mcp?key=sk_live_abc", undefined)).toBeNull();
    // A wrong key in the URL still gets the existing friendly message, not a challenge.
    expect(oauthChallenge("/mcp?key=typo", undefined)).toBeNull();
  });
});

describe("isUnexpiredAccessToken", () => {
  it("reads exp without verifying the signature", () => {
    expect(isUnexpiredAccessToken(live)).toBe(true);
    expect(isUnexpiredAccessToken(expired)).toBe(false);
  });

  it("rejects tokens without exp or that aren't JWTs", () => {
    expect(isUnexpiredAccessToken(jwt({ sub: "x" }))).toBe(false);
    expect(isUnexpiredAccessToken("a.b")).toBe(false);
    expect(isUnexpiredAccessToken("not.json.here")).toBe(false);
  });
});

describe("protected resource metadata", () => {
  it("names the MCP resource and the issuer", () => {
    expect(protectedResourceMetadata()).toMatchObject({
      resource: "https://mcp.localseodata.test/mcp",
      authorization_servers: ["https://localseodata.test"],
      bearer_methods_supported: ["header"],
    });
  });

  it("matches the challenge's resource_metadata URL", () => {
    expect(wwwAuthenticate()).toContain(RESOURCE_METADATA);
  });
});

describe("validateApiKey with OAuth on", () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("accepts an access token the API accepts, sending the server secret", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    globalThis.fetch = fetchMock;
    const result = await validateApiKey(() => `Bearer ${live}`);
    expect(result.valid).toBe(true);
    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({
      Authorization: `Bearer ${live}`,
      "X-MCP-Server-Secret": "mcp-server-secret-for-tests",
    });
  });

  it("reports invalid_token when the API rejects an access token", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "invalid_token" } }), { status: 401 }),
    );
    const result = await validateApiKey(() => `Bearer ${live}`);
    expect(result).toMatchObject({ valid: false, code: "invalid_token" });
    expect(result.message).toContain("Reconnect");
  });

  it("keeps the API key message for a rejected key", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 401 }));
    const result = await validateApiKey(() => "Bearer sk_live_revoked");
    expect(result).toMatchObject({ valid: false, code: "invalid_api_key" });
  });
});
