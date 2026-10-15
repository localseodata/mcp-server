import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callApi, formatResult, withErrorHandling } from "../api-client.js";
import {
  searchVolumeDataSchema,
  suggestionsDataSchema,
  overviewDataSchema,
  forSiteDataSchema,
  relatedDataSchema,
  trendsDataSchema,
} from "../schemas/keywords.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

export function registerKeywordTools(server: McpServer, getAuth: () => string) {
  server.registerTool(
    "search_volume",
    {
      description: "Use when you have specific keywords and need monthly volume, CPC, and competition data. Accepts up to 1000 keywords. Returns search_volume, cpc, competition, competition_level, and monthly_searches trend. Volumes are locally scoped when the location is a city/state (volume_scope: \"local\", data_source: \"google_ads\"); falls back to country-level numbers when local data is unavailable (volume_scope: \"country\") — check location_used for the actual scope. If location_alternatives is present, the location has sibling entities (e.g. \"Hamilton\" vs \"Hamilton Township\", NJ) whose volumes can differ 3-5x — check them before treating one number as the whole market. A null search_volume means no data, not zero searches. Costs 72 credits.",
      inputSchema: {
        keywords: z.array(z.string().min(1)).min(1).max(1000).describe("Array of keywords to analyze"),
        location: z.string().min(1).describe('Geographic location (e.g. "Orchard Park, NY")'),
        language: z.string().optional().describe('Language as ISO 639-1 code or name (e.g. "fr", "fr-FR", "French"). Defaults to English wherever we hold an English database for that country, and to the largest database that country has otherwise.'),
      },
      outputSchema: searchVolumeDataSchema,
      annotations: { ...READ_ONLY, title: "Keyword Search Volume" },
    },
    withErrorHandling(async ({ keywords, location, language }) => {
      const result = await callApi(
        "/v1/keywords/search-volume",
        { keywords, location, ...(language && { language }) },
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "keyword_suggestions",
    {
      description: "Use when generating new keyword ideas from a seed keyword. Keyword ideas come from our national keyword database; volumes and CPC are then localized via Google Ads for city/state locations (volume_scope: \"local\") with a labeled country-level fallback (volume_scope: \"country\") — check location_used for the actual scope, and location_alternatives for sibling entities like townships. keyword_difficulty remains national (SERP-based). A null search_volume means no data, not zero searches. For metrics on keywords you already have, search_volume returns volume/CPC directly. Costs 92 credits.",
      inputSchema: {
        keyword: z.string().min(1).describe('Seed keyword (e.g. "plumber")'),
        location: z.string().min(1).describe('Geographic location (e.g. "Orchard Park, NY")'),
        limit: z.number().int().min(1).max(1000).optional().describe("Max suggestions. Default: 50, max: 1000"),
        include_seed_keyword: z.boolean().optional().describe("Include seed keyword in results. Default: true"),
        language: z.string().optional().describe('Language as ISO 639-1 code or name (e.g. "fr", "fr-FR", "French"). Defaults to English wherever we hold an English database for that country, and to the largest database that country has otherwise.'),
      },
      outputSchema: suggestionsDataSchema,
      annotations: { ...READ_ONLY, title: "Keyword Suggestions" },
    },
    withErrorHandling(async ({ keyword, location, limit, include_seed_keyword, language }) => {
      const result = await callApi(
        "/v1/keywords/suggestions",
        {
          keyword,
          location,
          ...(limit && { limit }),
          ...(include_seed_keyword !== undefined && { include_seed_keyword }),
          ...(language && { language }),
        },
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "keyword_overview",
    {
      description: "Use when you have keywords and want the full picture on them: search volume, CPC and competition PLUS keyword_difficulty and search_intent (informational, navigational, commercial, transactional) and the averaged backlink profile of the pages currently ranking (backlinks, dofollow, referring_pages, referring_domains, referring_main_domains, and the 0-1000 rank and main_domain_rank authority scores) — what it takes to rank for each term. Accepts up to 1000 keywords. IMPORTANT: volumes are country-level (volume_scope: \"country\") — use search_volume instead when the city/state number is what matters. A null value means no data, not zero. Costs 10-116 credits, by keyword count (10 for one keyword, 20 for a hundred).",
      inputSchema: {
        keywords: z.array(z.string().min(1)).min(1).max(1000).describe("Keywords to look up"),
        location: z.string().min(1).describe('Geographic location — scoped to its country (e.g. "Orchard Park, NY" reads as United States)'),
        language: z.string().optional().describe('Language as ISO 639-1 code or name (e.g. "fr", "fr-FR", "French"). Defaults to English wherever we hold an English database for that country, and to the largest database that country has otherwise.'),
      },
      outputSchema: overviewDataSchema,
      annotations: { ...READ_ONLY, title: "Keyword Overview" },
    },
    withErrorHandling(async ({ keywords, location, language }) => {
      const result = await callApi(
        "/v1/keywords/overview",
        { keywords, location, ...(language && { language }) },
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "related_keywords",
    {
      description: "Use when expanding a keyword list with semantically related terms. Accepts up to 20 seed keywords. Returns related keywords with search_volume, cpc, competition, and competition_level, sorted by volume. A null search_volume means no data, not zero searches. Costs 72 credits.",
      inputSchema: {
        keywords: z.array(z.string().min(1)).min(1).max(20).describe("Array of seed keywords"),
        location: z.string().min(1).describe('Geographic location (e.g. "Orchard Park, NY")'),
        limit: z.number().int().min(1).max(1000).optional().describe("Max results. Default: 50, max: 1000"),
        language: z.string().optional().describe('Language as ISO 639-1 code or name (e.g. "fr", "fr-FR", "French"). Defaults to English wherever we hold an English database for that country, and to the largest database that country has otherwise.'),
      },
      outputSchema: relatedDataSchema,
      annotations: { ...READ_ONLY, title: "Related Keywords" },
    },
    withErrorHandling(async ({ keywords, location, limit, language }) => {
      const result = await callApi(
        "/v1/keywords/related",
        { keywords, location, ...(limit && { limit }), ...(language && { language }) },
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "keywords_for_site",
    {
      description: "Use when reverse-engineering what keywords a competitor domain ranks for. Returns keywords with search_volume, cpc, and competition. IMPORTANT: volumes are country-level (volume_scope: \"country\") — our keyword database for this tool has no city/state granularity; check location_used for the actual scope. Costs 20 credits.",
      inputSchema: {
        domain: z.string().min(1).describe('Domain to analyze (e.g. "example.com")'),
        location: z.string().min(1).describe('Geographic location (e.g. "Orchard Park, NY")'),
        limit: z.number().int().min(1).max(1000).optional().describe("Max results. Default: 50, max: 1000"),
        language: z.string().optional().describe('Language as ISO 639-1 code or name (e.g. "fr", "fr-FR", "French"). Defaults to English wherever we hold an English database for that country, and to the largest database that country has otherwise.'),
      },
      outputSchema: forSiteDataSchema,
      annotations: { ...READ_ONLY, title: "Keywords a Domain Ranks For" },
    },
    withErrorHandling(async ({ domain, location, limit, language }) => {
      const result = await callApi(
        "/v1/keywords/for-site",
        { domain, location, ...(limit && { limit }), ...(language && { language }) },
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "keyword_trends",
    {
      description: "Use when checking if a keyword is rising, stable, or declining over time. Returns one series per keyword: interest data points (weekly or monthly — see granularity; each point has date), peak_month (null when the keyword has no data), trend_direction, and has_data. The in-progress week/month is left out (partial_period_excluded). IMPORTANT: interest data is country-level (volume_scope: \"country\") — Google Trends via this source has no city/state granularity; check location_used for the actual scope. Periods: 3m, 6m, 12m (default), 5y. Costs 9 credits.",
      inputSchema: {
        keywords: z.array(z.string().min(1)).min(1).max(5).describe("Keywords to get trends for"),
        location: z.string().min(1).describe('Geographic location (e.g. "Orchard Park, NY")'),
        period: z.enum(["3m", "6m", "12m", "5y"]).optional().describe('Time period. Default: "12m"'),
      },
      outputSchema: trendsDataSchema,
      annotations: { ...READ_ONLY, title: "Keyword Trend Tracking" },
    },
    withErrorHandling(async ({ keywords, location, period }) => {
      const result = await callApi(
        "/v1/keywords/trends",
        { keywords, location, ...(period && { period }) },
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );
}
