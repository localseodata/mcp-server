import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callApi, callApiGet, formatResult, withErrorHandling } from "../api-client.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

/** Poll an async job until complete or failed. Returns the final data. */
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
    // Still pending/running — increase delay up to 4s
    delay = Math.min(delay * 1.3, 4000);
  }

  throw new Error("Audit timed out after 3 minutes. The job may still be processing — try polling the status URL.");
}

export function registerAuditTools(server: McpServer, getAuth: () => string) {
  server.tool(
    "local_audit",
    "Run a comprehensive local SEO audit. Checks local pack position, organic rankings, profile completeness, review velocity, and competitors. Returns actionable recommendations. Costs 50 credits. This runs as an async job and may take 15-45 seconds.",
    {
      business_name: z.string().describe("Business name"),
      location: z.string().describe("City and state"),
    },
    READ_ONLY,
    withErrorHandling(async ({ business_name, location }) => {
      // Submit the job
      const submitResult = await callApi(
        "/v1/audit/local",
        { business_name, location },
        getAuth(),
        30_000
      );
      const submitData = submitResult.data as Record<string, unknown>;

      // If cached result returned directly (no job_id), return immediately
      if (!submitData.job_id) {
        return { content: [{ type: "text" as const, text: formatResult(submitResult.data, submitResult) }] };
      }

      // Poll for completion
      const pollUrl = submitData.poll_url as string;
      const result = await pollAsyncJob(pollUrl, getAuth());
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );

  server.tool(
    "reputation_audit",
    "Audit online reputation across review platforms. Returns a reputation score, sentiment analysis (positive/negative themes), response rate, and recommendations. Costs 30 credits. Note: this tool queries multiple review sources and may take 10-30 seconds to return — this is normal, not an error.",
    {
      business_name: z.string().describe("Business name"),
      location: z.string().describe("City and state"),
    },
    READ_ONLY,
    withErrorHandling(async ({ business_name, location }) => {
      const result = await callApi(
        "/v1/audit/reputation",
        { business_name, location },
        getAuth(),
        120_000
      );
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );

  server.tool(
    "citation_audit",
    "Check NAP (Name, Address, Phone) consistency across 20 major directories like Yelp, BBB, Facebook, and YellowPages. Returns consistency score and per-directory details. Costs 50 credits.",
    {
      business_name: z.string().describe("Business name"),
      address: z.string().describe("Full business address"),
      phone: z.string().describe("Business phone number"),
    },
    READ_ONLY,
    withErrorHandling(async ({ business_name, address, phone }) => {
      const result = await callApi(
        "/v1/audit/citation",
        { business_name, address, phone },
        getAuth(),
        120_000
      );
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );
}
