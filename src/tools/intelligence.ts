import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callApi, formatResult, withErrorHandling } from "../api-client.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

export function registerIntelligenceTools(server: McpServer, getAuth: () => string) {
  server.tool(
    "local_authority",
    "Calculate a Local Authority Score (0-100) based on rankings, reviews, profile completeness, and citations. Includes a breakdown of each component and a percentile ranking. Costs 10 credits.",
    {
      business_name: z.string().describe("Business name"),
      location: z.string().describe("City and state"),
      keyword: z.string().optional().describe("Keyword to evaluate authority for (defaults to business name)"),
    },
    READ_ONLY,
    withErrorHandling(async ({ business_name, location, keyword }) => {
      const result = await callApi(
        "/v1/score/local-authority",
        { business_name, location, ...(keyword && { keyword }) },
        getAuth()
      );
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );

  server.tool(
    "keyword_opportunities",
    "Find local keyword opportunities for a business. Returns keywords with difficulty scores, your current rank, search volume, and top competitor info. Costs 4 credits.",
    {
      business_name: z.string().describe("Business name"),
      location: z.string().describe("City and state"),
      category: z.string().optional().describe("Business category to find keywords for (defaults to business name)"),
    },
    READ_ONLY,
    withErrorHandling(async ({ business_name, location, category }) => {
      const result = await callApi(
        "/v1/keywords/local-opportunities",
        { business_name, location, ...(category && { category }) },
        getAuth()
      );
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );
}
