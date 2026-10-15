import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAIVisibilityTools } from "./ai-visibility.js";
import { registerSerpTools } from "./serp.js";
import { registerGeogridTools } from "./geogrid.js";
import { geogridStatusDataSchema } from "../schemas/geogrid.js";
import {
  matchAnyDataSchema,
  sampleCompletedDataSchema,
  sampleStatusDataSchema,
} from "../schemas/ai-visibility.js";

// The SDK accepts an outputSchema only as an object shape. Handed a z.union it
// does not complain — it drops the schema, and the tool ships with no output
// validation at all. Declaring too NARROW an object is worse: the SDK
// validates structuredContent and throws "Output validation error" AFTER the
// HTTP call has been made and the credits spent, so the agent pays for an
// answer it never sees. Both failures are invisible without this test.

async function listTools() {
  const server = new McpServer({ name: "test", version: "0" });
  registerAIVisibilityTools(server, () => "key");
  registerSerpTools(server, () => "key");
  registerGeogridTools(server, () => "key");
  const handler = (server.server as unknown as {
    _requestHandlers: Map<string, (req: unknown, extra: unknown) => Promise<{ tools: Array<Record<string, unknown>> }>>;
  })._requestHandlers.get("tools/list")!;
  const res = await handler({ method: "tools/list", params: {} }, {});
  return res.tools;
}

describe("tool output schemas", () => {
  it("publishes an output schema for every tool that declares one", async () => {
    const tools = await listTools();
    for (const name of [
      "ai_match",
      "ai_sample",
      "ai_sample_status",
      "ai_scraper",
      "ai_mode",
      "ai_overview",
      "geogrid_status",
    ]) {
      const tool = tools.find((t) => t.name === name);
      expect(tool, `${name} is not registered`).toBeTruthy();
      expect(tool!.outputSchema, `${name} declared an outputSchema the SDK dropped`).toBeTruthy();
    }
  });

  it("accepts both shapes /v1/ai/match can answer in", async () => {
    const target = {
      business_name: "Cellino Plumbing",
      resolved_from: "business_profile" as const,
      cid: "1",
      domain: "",
      website: "https://cellino.com",
      phone: "+1 716-631-8080",
      address: "3 Coventry Green, Buffalo, NY",
    };

    const single = {
      target,
      matched: true,
      confidence: 0.9,
      matched_on: "phone" as const,
      rank: 2,
      match: { name: "The Classic Staple" },
      candidates: [{ name: "The Classic Staple", score: 0.9, matched_on: "phone" as const, rank: 2 }],
    };
    const acrossRuns = {
      target,
      runs_checked: 4,
      appearances: 2,
      appearance_rate: 0.5,
      best_rank: 1,
      worst_rank: 2,
      mean_rank: 1.5,
      runs: [
        {
          run: 1,
          matched: true,
          confidence: 0.9,
          matched_on: "phone" as const,
          rank: 1,
          match: { name: "x" },
          candidates: [],
        },
      ],
    };

    expect(matchAnyDataSchema.safeParse(single).success).toBe(true);
    expect(matchAnyDataSchema.safeParse(acrossRuns).success).toBe(true);
  });

  // A status poll lands on whichever state the job is in. Too narrow a schema
  // here throws AFTER the call, which on a poll strands the caller on top of a
  // job they have already paid for and cannot collect.
  it("accepts every state a sampling job can be polled in", async () => {
    const queued = { job_id: "sample_1", status: "pending", progress: 0, total_steps: 10 };
    const failed = { job_id: "sample_1", status: "failed", error: "search unavailable" };
    const complete = {
      job_id: "sample_1",
      status: "complete",
      keyword: "best plumber",
      platform: "gemini",
      credits_reserved: 40,
      credits_refunded: 4,
      credits_charged: 36,
      samples_requested: 10,
      samples_returned: 8,
      samples_failed: 1,
      samples_refused: 1,
      businesses: [
        {
          name: "WNY Snow Removal",
          matched_on: "name" as const,
          cid: "",
          domain: "wnysnowremoval.com",
          category: "",
          rating: null,
          reviews_count: 0,
          address: "",
          phone: "",
          website: "",
          appearances: 6,
          appearance_rate: 0.75,
          listing_appearances: 0,
          shortlist_appearances: 6,
          shortlist_rate: 0.75,
          top_pick_count: 1,
          // Gemini never lists, so these are null rather than a position the
          // business never held.
          best_rank: null,
          worst_rank: null,
          mean_rank: null,
          best_shortlist_rank: 2,
          mean_shortlist_rank: 3.5,
          runs_seen: [1, 2, 3, 4, 5, 6],
        },
      ],
      runs: [
        {
          run: 1,
          ok: true,
          outcome: "refused" as const,
          outcome_reason: "declined" as const,
          recommended_businesses: [],
          businesses: [],
          response_text: "I'm having a hard time fulfilling your request.",
        },
        {
          run: 2,
          ok: true,
          outcome: "answered" as const,
          recommended_businesses: [
            {
              shortlist_rank: 5,
              listed: true,
              mention: "WNY Snow Removal \u2014 cheapest per-storm rate.",
              name: "WNY Snow Removal",
              is_top_pick: false,
              citation: { url: "https://wnysnowremoval.com", domain: "wnysnowremoval.com" },
            },
            // A business the answer named in a sentence rather than listing.
            // The null rank has to validate: a schema that required a number
            // here would throw AFTER the samples were billed.
            {
              shortlist_rank: null,
              listed: false,
              mention: "For a commercial lot, I'd also consider Southtowns Plowing.",
              name: "Southtowns Plowing",
              is_top_pick: false,
              citation: { url: "", domain: "" },
            },
            // And the shape the deployed API still sends, with neither of the
            // new fields, for the length of the deploy window.
            {
              shortlist_rank: 6,
              name: "Erie County Snow Pros",
              is_top_pick: false,
              citation: { url: "", domain: "" },
            },
          ],
          businesses: [],
          response_text: "…",
        },
      ],
    };

    for (const payload of [queued, failed, complete]) {
      const result = sampleStatusDataSchema.safeParse(payload);
      expect(result.success ? [] : result.error.issues).toEqual([]);
    }
    expect(sampleCompletedDataSchema.safeParse(complete).success).toBe(true);
  });

  it("accepts every state a geogrid scan can be polled in", async () => {
    const running = { job_id: "geo_1", status: "processing", progress: 12, total: 25 };
    const failed = { job_id: "geo_1", status: "failed", error: "search unavailable" };
    const complete = {
      job_id: "geo_1",
      status: "complete",
      grid: [[1]],
      grid_points: [{ row: 0, col: 0, lat: 42.7, lng: -78.7, rank: 1 }],
      average_rank: 1,
      found_in: 1,
      total_points: 1,
      center: { lat: 42.7, lng: -78.7 },
      grid_size: "5x5",
      radius_miles: 3,
      cached: false,
      completed_at: "2026-09-18T20:00:00.000Z",
    };

    for (const payload of [running, failed, complete]) {
      const result = geogridStatusDataSchema.safeParse(payload);
      expect(result.success ? [] : result.error.issues).toEqual([]);
    }
  });

  it("still rejects a response that is not a match result at all", async () => {
    expect(matchAnyDataSchema.safeParse({ nonsense: true }).success).toBe(false);
    expect(sampleCompletedDataSchema.safeParse({ nonsense: true }).success).toBe(false);
  });
});
