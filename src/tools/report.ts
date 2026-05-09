import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callApi, formatResult, withErrorHandling } from "../api-client.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

export function registerReportTools(server: McpServer, getAuth: () => string) {
  server.tool(
    "competitor_gap",
    "Compare your business against local competitors. Identifies ranking gaps, review count differences, and rating advantages. Costs 10 credits.",
    {
      business_name: z.string().describe("Your business name"),
      location: z.string().describe("City and state"),
      keyword: z.string().optional().describe("Keyword to compare on (defaults to business name)"),
      competitors: z.number().int().min(1).max(10).optional().describe("Number of competitors to analyze (1-10). Default: 5"),
    },
    READ_ONLY,
    withErrorHandling(async ({ business_name, location, keyword, competitors }) => {
      const result = await callApi(
        "/v1/report/competitor-gap",
        { business_name, location, ...(keyword && { keyword }), ...(competitors && { competitors }) },
        getAuth()
      );
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );
}
