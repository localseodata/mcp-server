import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callApi, formatResult, withErrorHandling } from "../api-client.js";
import { competitorGapDataSchema } from "../schemas/report.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

export function registerReportTools(server: McpServer, getAuth: () => string) {
  server.registerTool(
    "competitor_gap",
    {
      description: "Use when comparing your business vs local competitors on rankings, reviews, ratings, and Google Business Profile completeness. Returns your_business stats, competitor details with advantages, and your_gaps. Costs 10 credits + 2 per competitor actually returned (default 5 competitors = 20 credits; thin markets may return fewer and cost less).",
      inputSchema: {
        business_name: z.string().describe("Your business name"),
        location: z.string().describe("City and state"),
        keyword: z.string().optional().describe("Keyword to compare on (defaults to business name)"),
        competitors: z.number().int().min(1).max(10).optional().describe("Number of competitors to analyze (1-10). Default: 5"),
      },
      outputSchema: competitorGapDataSchema,
      annotations: { ...READ_ONLY, title: "Competitor Gap Analysis" },
    },
    withErrorHandling(async ({ business_name, location, keyword, competitors }) => {
      const result = await callApi(
        "/v1/report/competitor-gap",
        { business_name, location, ...(keyword && { keyword }), ...(competitors && { competitors }) },
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );
}
