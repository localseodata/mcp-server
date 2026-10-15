import { describe, it, expect } from "vitest";
import Ajv from "ajv";
import { createMcpServer } from "./server.js";

// Clients that validate structuredContent against a tool's outputSchema (the
// Anthropic MCP connector does) reject the whole call over one undeclared
// field. On 2026-09-29 that failed every organic_serp call (location_used was
// never declared) and every cached page_audit from before `fid` was removed.
// These tests validate the way such a client does: Ajv against the JSON
// Schema the server advertises in tools/list.

async function listTools() {
  const server = createMcpServer(() => "test-key");
  const handler = (server.server as unknown as {
    _requestHandlers: Map<string, (req: unknown, extra: unknown) => Promise<{ tools: any[] }>>;
  })._requestHandlers.get("tools/list")!;
  return (await handler({ method: "tools/list", params: {} }, {})).tools;
}

function strictObjects(schema: unknown, path = "$"): string[] {
  if (!schema || typeof schema !== "object") return [];
  const s = schema as Record<string, unknown>;
  const found = s.additionalProperties === false ? [path] : [];
  for (const [k, v] of Object.entries(s)) {
    if (Array.isArray(v)) v.forEach((x, i) => found.push(...strictObjects(x, `${path}.${k}[${i}]`)));
    else if (v && typeof v === "object") found.push(...strictObjects(v, `${path}.${k}`));
  }
  return found;
}

function validatorFor(tools: any[], name: string) {
  const tool = tools.find((t) => t.name === name);
  return new Ajv({ strict: false }).compile(tool.outputSchema);
}

describe("advertised output schemas", () => {
  it("no tool forbids extra fields at any level", async () => {
    const tools = await listTools();
    const withSchema = tools.filter((t) => t.outputSchema);
    expect(withSchema.length).toBeGreaterThan(40);
    const offenders = withSchema.flatMap((t) => strictObjects(t.outputSchema).map((p) => `${t.name} ${p}`));
    expect(offenders).toEqual([]);
  });

  it("accepts a page_audit answer cached before fid was removed", async () => {
    const validate = validatorFor(await listTools(), "page_audit");
    const cachedBeforeFix = {
      seo_score: 95.24,
      title: "Home | Jon the Plumber",
      meta_description: "",
      h1: ["Redefining the neighborhood plumber."],
      word_count: 0,
      load_time_ms: 1929,
      core_web_vitals: { lcp: null, cls: null, fid: null },
      issues: [{ severity: "critical", issue: "Page is missing a meta description" }],
      schema_markup: [],
      mobile_friendly: true,
    };
    expect(validate(cachedBeforeFix), JSON.stringify(validate.errors)).toBe(true);
  });

  it("accepts organic_serp with its geo disclosure", async () => {
    const validate = validatorFor(await listTools(), "organic_serp");
    const response = {
      organic_results: [{ rank: 5, organic_position: 1, title: "t", url: "https://x.com", snippet: null }],
      local_pack: [],
      ads: [],
      people_also_ask: [],
      ai_overview: null,
      lsa_ads: [],
      knowledge_panel: null,
      location_used: "Buffalo, New York, United States",
    };
    expect(validate(response), JSON.stringify(validate.errors)).toBe(true);
  });

  it("still rejects a response missing a required field", async () => {
    const validate = validatorFor(await listTools(), "page_audit");
    expect(validate({ title: "no score" })).toBe(false);
  });
});
