import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callApi, formatResult, withErrorHandling } from "../api-client.js";
import {
  platformSerpDataSchema,
  platformProfileDataSchema,
} from "../schemas/platforms.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

/** Apple Maps and Bing tools. Separate from the Google tools because the
 *  platforms answer different questions: Apple feeds Siri and Apple
 *  Intelligence, Bing Places feeds Copilot and ChatGPT's web layer, and
 *  both are canonical citations a local business is expected to hold. */
export function registerPlatformTools(server: McpServer, getAuth: () => string) {
  server.registerTool(
    "apple_maps",
    {
      description:
        "Checks how businesses rank on Apple Maps for a keyword. Use when the question is about Apple Maps, Siri, Apple Business Connect, or visibility on iPhone — Google local_pack does not cover these. Returns rank, name, address, phone, website, rating, reviews_count, categories, hours, coordinates, and platform_id (Apple's MUID, stable and worth keeping for later lookups). claimed: false means Apple states the listing has never been claimed in Apple Business Connect — report that as a finding, it is usually more actionable than any NAP mismatch. claimed: null means Apple said nothing about claim state; report it as unknown and never as claimed, because Apple only ever reports the unclaimed case. Ratings are normalized to a 5-point scale (Apple mixes 5-point and 100-point scales internally). data_source names who Apple credits for the record (\"yelp\", \"foursquare\"; empty when Apple credits no one) — when it is non-empty the record was ingested from that provider rather than supplied by the owner, so website often points at the provider's page and must NOT be reported as a NAP mismatch against the client's domain. A 502 mentioning results outside the requested location means Apple applied the location inconsistently and answered from elsewhere; retry once, and if it persists say Apple Maps data is unavailable for that city right now — never substitute a nearby city's rankings. Costs 3 credits.",
      inputSchema: {
        keyword: z.string().describe('Search keyword (e.g. "plumber")'),
        location: z.string().describe('City and state (e.g. "Orchard Park, NY")'),
        limit: z.number().int().min(1).max(50).optional().describe("Results to return. Default: 20"),
        sort: z
          .enum(["default", "distance", "ratings"])
          .optional()
          .describe("Result ordering. Default: default (best match)"),
      },
      outputSchema: platformSerpDataSchema,
      annotations: { ...READ_ONLY, title: "Apple Maps Rankings" },
    },
    withErrorHandling(async ({ keyword, location, limit, sort }) => {
      const result = await callApi(
        "/v1/serp/apple-maps",
        { keyword, location, ...(limit && { limit }), ...(sort && { sort }) },
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "bing_local",
    {
      description:
        "Checks how businesses rank in Bing's local results for a keyword. Use when the question is about Bing, Bing Places, Copilot, or ChatGPT local recommendations — ChatGPT's web layer draws on Bing, so this is the closest measurable proxy for it. Returns rank, name, address, phone, website, hours, coordinates, and platform_id. Bing publishes no ratings or review counts on local results, so rating is null and reviews_count is 0 — that is a platform limitation, not missing data. claimed is always null: Bing gives no claimed/unclaimed signal. Costs 3 credits.",
      inputSchema: {
        keyword: z.string().describe('Search keyword (e.g. "plumber")'),
        location: z.string().describe('City and state (e.g. "Orchard Park, NY")'),
        limit: z.number().int().min(1).max(30).optional().describe("Results to return. Default: 20"),
      },
      outputSchema: platformSerpDataSchema,
      annotations: { ...READ_ONLY, title: "Bing Local Rankings" },
    },
    withErrorHandling(async ({ keyword, location, limit }) => {
      const result = await callApi(
        "/v1/serp/bing-local",
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
    "apple_business_profile",
    {
      description:
        "Fetches a business's Apple Maps listing (NAP, rating, categories, coordinates). Use when auditing Apple Business Connect or checking NAP consistency on Apple. matched:false means no Apple listing exists at all. A listing that exists but has claimed:false means it exists and was never claimed in Apple Business Connect — a different, very common finding. claimed:null means unknown, not claimed. Both are results worth reporting, not errors. Check data_source before reporting a website mismatch: a non-empty value (\"yelp\") means Apple ingested the record from that provider, so its website is the provider's page by design. The returned platform_id is Apple's MUID: pass it back as `muid` on later calls to skip the name-resolution search, which drops the cost from 5 credits to 3. Costs 5 credits (3 with muid).",
      inputSchema: {
        business_name: z.string().describe("Business name"),
        location: z.string().describe('City and state (e.g. "Orchard Park, NY")'),
        muid: z
          .string()
          .optional()
          .describe("Apple MUID from a previous response, to skip the lookup search"),
      },
      outputSchema: platformProfileDataSchema,
      annotations: { ...READ_ONLY, title: "Apple Maps Business Profile" },
    },
    withErrorHandling(async ({ business_name, location, muid }) => {
      const result = await callApi(
        "/v1/business/apple-profile",
        { business_name, location, ...(muid && { muid }) },
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "bing_business_profile",
    {
      description:
        "Fetches a business's Bing Maps listing (NAP, rating, coordinates). Use when auditing Bing Places or checking NAP consistency on Bing. matched:false means no Bing listing was found, which usually means Bing Places was never claimed — a finding, not an error. Costs 3 credits.",
      inputSchema: {
        business_name: z.string().describe("Business name"),
        location: z.string().describe('City and state (e.g. "Orchard Park, NY")'),
      },
      outputSchema: platformProfileDataSchema,
      annotations: { ...READ_ONLY, title: "Bing Places Business Profile" },
    },
    withErrorHandling(async ({ business_name, location }) => {
      const result = await callApi(
        "/v1/business/bing-profile",
        { business_name, location },
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );
}
