import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callApiGet, formatResult, withErrorHandling } from "../api-client.js";
import { locationSearchDataSchema } from "../schemas/locations.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

export function registerLocationTools(server: McpServer, getAuth: () => string) {
  server.registerTool(
    "location_search",
    {
      description: "Use when resolving city names to the exact format needed by other tools. Call this when a tool returns no results for a location or when the format is ambiguous. Returns name, code, type (location taxonomy: City, County, State, DMA Region, ...), state, country, and parent_code, plus total_count and a truncated flag. IMPORTANT for multi-location ambiguity: many municipalities exist twice (e.g. \"Hamilton\" AND \"Hamilton Township\" in NJ — different entities with very different search volumes); pass a bare place name plus the state param to see all of them. Free (0 credits).",
      inputSchema: {
        q: z.string().min(1).describe('Place name (e.g. "Cherry Hill" or "Austin, TX"). Prefer a bare name + state param over baking the state into q.'),
        state: z.string().optional().describe('State/province filter, name or abbreviation (e.g. "NJ"). Scopes matching without hiding suffixed entities like townships.'),
        country: z.string().optional().describe('Country filter (e.g. "United States" or "US")'),
        limit: z.number().int().min(1).max(50).optional().describe("Max results. Default: 10"),
      },
      outputSchema: locationSearchDataSchema,
      annotations: { ...READ_ONLY, title: "Location Name Resolver" },
    },
    withErrorHandling(async ({ q, state, country, limit }) => {
      const params = new URLSearchParams({ q });
      if (state) params.set("state", state);
      if (country) params.set("country", country);
      if (limit) params.set("limit", String(limit));
      const result = await callApiGet(`/v1/locations/search?${params}`, getAuth());
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );
}
