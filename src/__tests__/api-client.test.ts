import { describe, it, expect } from "vitest";
import { formatResult, withErrorHandling } from "../api-client.js";

describe("formatResult", () => {
  it("formats data with credit metadata", () => {
    const result = formatResult({ foo: "bar" }, { credits_used: 2, credits_remaining: 48, cached: false });
    expect(result).toContain("2 credits used");
    expect(result).toContain("48 remaining");
    expect(result).toContain('"foo": "bar"');
    expect(result).not.toContain("cached");
  });

  it("shows cached flag when true", () => {
    const result = formatResult({}, { credits_used: 0, credits_remaining: 50, cached: true });
    expect(result).toContain("cached");
    expect(result).toContain("0 credits used");
  });

  it("uses singular 'credit' for 1", () => {
    const result = formatResult({}, { credits_used: 1, credits_remaining: 99, cached: false });
    expect(result).toContain("1 credit used");
    expect(result).not.toContain("1 credits");
  });
});

describe("withErrorHandling", () => {
  it("passes through successful results", async () => {
    const handler = withErrorHandling(async () => ({
      content: [{ type: "text" as const, text: "ok" }],
    }));
    const result = await handler({});
    expect(result.content[0].text).toBe("ok");
    expect(result.isError).toBeUndefined();
  });

  it("catches errors and returns MCP error content", async () => {
    const handler = withErrorHandling(async () => {
      throw new Error("insufficient credits");
    });
    const result = await handler({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("insufficient credits");
  });

  it("handles non-Error throws", async () => {
    const handler = withErrorHandling(async () => {
      throw "string error";
    });
    const result = await handler({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("string error");
  });
});
