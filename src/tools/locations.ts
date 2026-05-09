import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callApiGet, formatResult, withErrorHandling } from "../api-client.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

export function registerLocationTools(server: McpServer, getAuth: () => string) {
  server.tool(
    "location_search",
    "Search for DataForSEO location names. Use this BEFORE other tools to resolve a city/region into the exact location_name format that DataForSEO requires (e.g. 'Orchard Park,New York,United States'). Free — costs 0 credits.",
    {
      q: z.string().min(1).describe('Location query (e.g. "Orchard Park" or "Austin TX")'),
      limit: z.number().int().min(1).max(50).optional().describe("Max results. Default: 10"),
    },
    READ_ONLY,
    withErrorHandling(async ({ q, limit }) => {
      const params = new URLSearchParams({ q });
      if (limit) params.set("limit", String(limit));
      const result = await callApiGet(`/v1/locations/search?${params}`, getAuth());
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );
}
