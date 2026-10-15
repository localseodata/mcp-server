import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callApi, formatResult, withErrorHandling } from "../api-client.js";
import {
  localPackDataSchema,
  organicDataSchema,
  lsaDataSchema,
  mapsDataSchema,
  localFinderDataSchema,
  aiOverviewDataSchema,
  aiModeDataSchema,
} from "../schemas/serp.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

export function registerSerpTools(server: McpServer, getAuth: () => string) {
  server.registerTool(
    "local_pack",
    {
      description: "Checks where businesses rank in Google's local pack for a keyword. Returns rank, name, cid, rating, reviews_count, address, phone, hours, website. Returns the top 3 by default; set depth for a deeper local ranking list (up to 60), and device to check desktop vs mobile. maps returns GPS coordinates and place_ids instead of CIDs. Costs 2 credits.",
      inputSchema: {
        keyword: z.string().describe('Search keyword (e.g. "plumber")'),
        location: z.string().describe('City and state (e.g. "Orchard Park, NY")'),
        device: z.enum(["desktop", "mobile"]).optional().describe("Device type. Default: desktop"),
        depth: z.number().int().min(1).max(60).optional().describe("Number of results. Default: 20, max: 60"),
      },
      outputSchema: localPackDataSchema,
      annotations: { ...READ_ONLY, title: "Google Local Pack Rankings" },
    },
    withErrorHandling(async ({ keyword, location, device, depth }) => {
      const result = await callApi(
        "/v1/serp/local-pack",
        { keyword, location, ...(device && { device }), ...(depth && { depth }) },
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "organic_serp",
    {
      description: "Use when you need the complete Google search results page in one call: organic listings, local pack, ads, People Also Ask, AI overview, LSA ads, and knowledge panel. Best for auditing overall search presence. Costs 2 credits.",
      inputSchema: {
        keyword: z.string().describe('Search keyword (e.g. "best plumber near me")'),
        location: z.string().describe('City and state (e.g. "Orchard Park, NY")'),
      },
      outputSchema: organicDataSchema,
      annotations: { ...READ_ONLY, title: "Full Google SERP" },
    },
    withErrorHandling(async ({ keyword, location }) => {
      const result = await callApi("/v1/serp/organic", { keyword, location }, getAuth());
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "local_services_ads",
    {
      description: "Use when checking Google Guaranteed/Screened ads for service categories (home services, legal, etc.). Returns business names, ratings, and reviews from the LSA carousel on the Google results page; badge, years_in_business, phone and services are filled only when Google shows them there. Retries on the mobile SERP when desktop shows no LSAs; lsa_block_found: false means Google showed none for the query. Costs 2 credits.",
      inputSchema: {
        keyword: z.string().describe('Search keyword (e.g. "plumber")'),
        location: z.string().describe('City and state (e.g. "Orchard Park, NY")'),
      },
      outputSchema: lsaDataSchema,
      annotations: { ...READ_ONLY, title: "Local Services Ads (Google Guaranteed)" },
    },
    withErrorHandling(async ({ keyword, location }) => {
      const result = await callApi("/v1/serp/lsa", { keyword, location }, getAuth());
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "maps",
    {
      description: "Returns local map results with GPS coordinates — up to 60 listings with name, place_id, rating, reviews_count, address, phone, website, hours, lat/lng, and categories. Paid map pins are excluded from the ranking and listed in sponsored_results. If the first search returns nothing, the API automatically retries once with the city appended to the keyword (geo_fallback_applied: true, keyword_used shows the retried keyword). Unresolvable locations return a validation error instead of silently searching country-wide. local_pack returns just the top 3 with CIDs if that's all you need. Costs 2 credits.",
      inputSchema: {
        keyword: z.string().describe('Search keyword (e.g. "dentist")'),
        location: z.string().describe('City and state (e.g. "Orchard Park, NY")'),
        limit: z.number().int().min(1).max(100).optional().describe("Number of results. Default: 20, max: 100"),
      },
      outputSchema: mapsDataSchema,
      annotations: { ...READ_ONLY, title: "Google Maps Local Results" },
    },
    withErrorHandling(async ({ keyword, location, limit }) => {
      const result = await callApi(
        "/v1/serp/maps",
        { keyword, location, ...(limit && { limit }) },
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "local_finder",
    {
      description: "Use when you need local listings with Google CID identifiers (instead of GPS coordinates from maps). Returns names, ratings, reviews, addresses, phone, hours, websites, and CIDs. Supports min_rating filter. Costs 2 credits.",
      inputSchema: {
        keyword: z.string().describe('Search keyword (e.g. "plumber")'),
        location: z.string().describe('City and state (e.g. "Orchard Park, NY")'),
        limit: z.number().int().min(1).max(100).optional().describe("Number of results. Default: 20, max: 100"),
        min_rating: z.number().min(0).max(5).optional().describe("Minimum star rating filter (0-5)"),
      },
      outputSchema: localFinderDataSchema,
      annotations: { ...READ_ONLY, title: "Google Local Finder Listings" },
    },
    withErrorHandling(async ({ keyword, location, limit, min_rating }) => {
      const result = await callApi(
        "/v1/serp/local-finder",
        { keyword, location, ...(limit && { limit }), ...(min_rating !== undefined && { min_rating }) },
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "ai_overview",
    {
      description: "Use when checking if Google shows an AI Overview for a keyword and what sources it cites. Returns has_ai_overview, asynchronous_ai_overview, summary_text, and cited_sources with URLs. Each cited source carries a position — the order the overview cited it, from 1, counted after duplicate pages collapse. asynchronous_ai_overview reports that Google rendered the overview after page load — this tool fetches those as well, so summary_text and cited_sources are populated either way. Costs 2 credits. May take 10-30 seconds — fetching an asynchronous overview is a second request to Google.",
      inputSchema: {
        keyword: z.string().describe('Search keyword (e.g. "best plumber near me")'),
        location: z.string().describe('City and state (e.g. "Orchard Park, NY")'),
        fresh: z.boolean().optional().describe("Bypass the hour of caching and run the query again. Use when sampling the same prompt repeatedly to measure how the answer varies — a cached hit would return the earlier run and hide the variance. Always billed at the normal price, since there is no cache hit to be free."),
      },
      outputSchema: aiOverviewDataSchema,
      annotations: { ...READ_ONLY, title: "Google AI Overview" },
    },
    withErrorHandling(async ({ keyword, location, fresh }) => {
      const result = await callApi(
        "/v1/serp/ai-overview",
        { keyword, location, ...(fresh && { fresh }) },
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "ai_mode",
    {
      description: "Use when getting the Google AI Mode (SGE) generated answer for a keyword. Returns ai_response text, local_businesses, reference links, and shopping items. Costs 2 credits. May take 10-30 seconds; Google generates the answer per request.\n\nLOCAL BUSINESSES: on a local question Google recommends businesses inside the answer and we return them as local_businesses — rank, name, category, rating, reviews_count, address, website, domain, cid. Field names shared with /v1/serp/local-pack mean the same things; the sets differ in that this adds category and domain and has no hours. cid is an empty string when the Directions link was unreadable. Two differences from ai_scraper on chat_gpt: phone is always empty (Google renders a Call button and never sends the number), and cid is populated — Google's own identifier for the business, in decimal, which /v1/business/profile also takes. Match on cid rather than on name where you can.\n\nREVIEW COUNTS ARE ROUNDED: Google abbreviates above a thousand, so reviews_count is 1200 where the exact figure is 1194. Do not compare it to a count from another endpoint and read the difference as change.\n\nparse_status reports whether the businesses could be read: \"ok\", \"no_businesses\" when the answer named none, or \"unparsed\" when business cards were present and none could be read — which means Google changed the format. references is unreliable for citations: on some answers it carries real domains, on others every entry collapses to a google.com redirect, and it never names the businesses either way.",
      inputSchema: {
        keyword: z.string().describe('Search keyword (e.g. "best plumber near me")'),
        location: z.string().describe('City and state (e.g. "Orchard Park, NY")'),
        fresh: z.boolean().optional().describe("Bypass the hour of caching and run the query again. Use when sampling the same prompt repeatedly to measure how the answer varies — a cached hit would return the earlier run and hide the variance. Always billed at the normal price, since there is no cache hit to be free."),
      },
      outputSchema: aiModeDataSchema,
      annotations: { ...READ_ONLY, title: "Google AI Mode Answer" },
    },
    withErrorHandling(async ({ keyword, location, fresh }) => {
      const result = await callApi(
        "/v1/serp/ai-mode",
        { keyword, location, ...(fresh && { fresh }) },
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );
}
