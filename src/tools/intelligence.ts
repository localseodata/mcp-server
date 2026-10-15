import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callApi, formatResult, withErrorHandling } from "../api-client.js";
import { localAuthorityDataSchema, localOpportunitiesDataSchema } from "../schemas/report.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

export function registerIntelligenceTools(server: McpServer, getAuth: () => string) {
  server.registerTool(
    "local_authority",
    {
      description: "Use when calculating a composite 0-100 local authority score. Returns authority_score with breakdown by ranking, reviews, profile, and citations (each with score, max, and detail), plus percentile. Good single metric to track over time. Costs 10 credits.",
      inputSchema: {
        business_name: z.string().describe("Business name"),
        location: z.string().describe("City and state"),
        keyword: z.string().optional().describe("Keyword to evaluate authority for (defaults to business name)"),
      },
      outputSchema: localAuthorityDataSchema,
      annotations: { ...READ_ONLY, title: "Local Authority Score" },
    },
    withErrorHandling(async ({ business_name, location, keyword }) => {
      const result = await callApi(
        "/v1/score/local-authority",
        { business_name, location, ...(keyword && { keyword }) },
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "keyword_opportunities",
    {
      description: "Use when finding the best local keywords to target based on difficulty vs current rank. Returns keywords with estimated_difficulty, your_rank, and search_volume. Costs 4 credits.",
      inputSchema: {
        business_name: z.string().describe("Business name"),
        location: z.string().describe("City and state"),
        category: z.string().optional().describe("Business category to find keywords for (defaults to business name)"),
      },
      outputSchema: localOpportunitiesDataSchema,
      annotations: { ...READ_ONLY, title: "Local Keyword Opportunities" },
    },
    withErrorHandling(async ({ business_name, location, category }) => {
      const result = await callApi(
        "/v1/keywords/local-opportunities",
        { business_name, location, ...(category && { category }) },
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );
}
