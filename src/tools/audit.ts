import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callApi, callApiGet, formatResult, withErrorHandling } from "../api-client.js";
import {
  reputationAuditDataSchema,
  citationAuditDataSchema,
} from "../schemas/audit.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

async function pollAsyncJob(
  pollUrl: string,
  auth: string,
  maxWaitMs: number = 180_000
): Promise<{ data: unknown; credits_used: number; credits_remaining: number; cached: boolean }> {
  const start = Date.now();
  let delay = 2000;

  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, delay));
    const result = await callApiGet(pollUrl, auth);
    const data = result.data as Record<string, unknown>;

    if (data.status === "complete") {
      return result;
    }
    if (data.status === "failed") {
      throw new Error((data.error as string) || "Audit job failed");
    }
    delay = Math.min(delay * 1.3, 4000);
  }

  throw new Error("Audit timed out after 3 minutes. The job may still be processing — try polling the status URL.");
}

export function registerAuditTools(server: McpServer, getAuth: () => string) {
  server.registerTool(
    "local_audit",
    {
      description: "Use when running a comprehensive local SEO check: SERP + profile + reviews + competitors in one call. Returns local_pack_position, organic_positions, rating, reviews_count, profile_completeness, review_velocity, competitors, and recommendations. Expensive (50 credits) -- confirm with user first. Async, takes 15-45 seconds.",
      inputSchema: {
        business_name: z.string().describe("Business name"),
        location: z.string().describe("City and state"),
      },
      annotations: { ...READ_ONLY, title: "Comprehensive Local SEO Audit" },
    },
    withErrorHandling(async ({ business_name, location }) => {
      const submitResult = await callApi(
        "/v1/audit/local",
        { business_name, location },
        getAuth(),
        30_000
      );
      const submitData = submitResult.data as Record<string, unknown>;

      if (!submitData.job_id) {
        return {
          content: [{ type: "text" as const, text: formatResult(submitResult.data, submitResult) }],
          structuredContent: submitResult.data as Record<string, unknown>,
        };
      }

      const pollUrl = submitData.poll_url as string;
      const result = await pollAsyncJob(pollUrl, getAuth());
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "reputation_audit",
    {
      description: "Use when analyzing cross-platform review reputation with sentiment. Returns reputation_score, per-platform ratings, sentiment themes, response_rate, and recommendations. Costs 30 credits. May take 10-30 seconds.",
      inputSchema: {
        business_name: z.string().describe("Business name"),
        location: z.string().describe("City and state"),
      },
      outputSchema: reputationAuditDataSchema,
      annotations: { ...READ_ONLY, title: "Reputation Audit" },
    },
    withErrorHandling(async ({ business_name, location }) => {
      const result = await callApi(
        "/v1/audit/reputation",
        { business_name, location },
        getAuth(),
        120_000
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "citation_audit",
    {
      description: "Use when checking NAP (Name, Address, Phone) consistency across business directories (Yelp, BBB, Facebook, YellowPages, Angi, Houzz, Trustpilot and more). Returns consistency_score (0-100 partial-credit average over found listings; null when no listings found) and per-directory match details. Match fields are true (verified), false (conflicting value found), or null (listing found but the field isn't visible in search data, so it can't be verified). Every directory selected is scanned whether or not a listing exists there, so directories_checked always equals what was requested -- a business listed on only a handful still returns a row per directory. Scans the top 20 directories by default (50 credits); `directories` takes a count up to 50 or an explicit list of directory names, and costs 2.5 credits each (all 50 = 125 credits). Expensive -- confirm with user first.",
      inputSchema: {
        business_name: z.string().describe("Business name"),
        address: z.string().describe("Full business address"),
        phone: z.string().describe("Business phone number"),
        directories: z
          .union([z.number().int().min(1).max(50), z.array(z.string()).min(1).max(50)])
          .optional()
          .describe(
            "How much to scan, at 2.5 credits per directory. A number takes the top N of 50 (default 20 = 50 credits; 50 = 125 credits), or pass exact directory names e.g. [\"yelp\", \"bbb\", \"houzz\"]"
          ),
      },
      outputSchema: citationAuditDataSchema,
      annotations: { ...READ_ONLY, title: "Citation / NAP Consistency Audit" },
    },
    withErrorHandling(async ({ business_name, address, phone, directories }) => {
      const result = await callApi(
        "/v1/audit/citation",
        { business_name, address, phone, ...(directories ? { directories } : {}) },
        getAuth(),
        120_000
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );
}
