import { z } from "zod";

export const localPackDataSchema = z.object({
  results: z.array(
    z.object({
      rank: z.number(),
      name: z.string(),
      cid: z.string(),
      rating: z.number().nullable(),
      reviews_count: z.number(),
      address: z.string(),
      phone: z.string(),
      hours: z.unknown(),
      website: z.string(),
    })
  ),
  total_results: z.number(),
  keyword: z.string(),
  location: z.string(),
  // Geo disclosure contract (optional for deploy-order compatibility)
  location_used: z.string().optional(),
  location_alternatives: z
    .array(z.object({ name: z.string(), code: z.number(), type: z.string() }))
    .optional(),
});

export const organicDataSchema = z.object({
  organic_results: z.array(
    z.object({
      // Absolute position on the page (counts local pack, PAA, etc.)
      rank: z.number(),
      // Position among organic results only, from 1 (optional for
      // deploy-order compatibility)
      organic_position: z.number().optional(),
      title: z.string(),
      url: z.string(),
      snippet: z.string().nullable(),
    })
  ),
  local_pack: z.array(
    z.object({
      rank: z.number(),
      name: z.string(),
      cid: z.string(),
      rating: z.number().nullable(),
      reviews_count: z.number(),
    })
  ),
  ads: z.array(
    z.object({
      position: z.string(),
      title: z.string(),
      url: z.string(),
      description: z.string(),
    })
  ),
  people_also_ask: z.array(z.string()),
  ai_overview: z.string().nullable(),
  lsa_ads: z.array(
    z.object({
      rank: z.number(),
      business_name: z.string(),
      rating: z.number().nullable(),
      reviews_count: z.number(),
    })
  ),
  knowledge_panel: z
    .object({
      title: z.string(),
      subtitle: z.string(),
      description: z.string(),
      url: z.string().nullable(),
      image_url: z.string().nullable(),
    })
    .nullable(),
  // Geo disclosure contract — always returned, never declared until a
  // strict client rejected every organic_serp call over it
  location_used: z.string().optional(),
  location_alternatives: z
    .array(z.object({ name: z.string(), code: z.number(), type: z.string() }))
    .optional(),
});

export const lsaDataSchema = z.object({
  ads: z.array(
    z.object({
      rank: z.number(),
      business_name: z.string(),
      rating: z.number().nullable(),
      reviews_count: z.number(),
      badge: z.string().nullable(),
      years_in_business: z.number().nullable(),
      phone: z.string(),
      services: z.array(z.string()),
    })
  ),
  total_ads: z.number(),
  // false = Google showed no LSA block for the query (optional for
  // deploy-order compatibility)
  lsa_block_found: z.boolean().optional(),
  device_used: z.enum(["desktop", "mobile"]).optional(),
  keyword: z.string(),
  location: z.string(),
  // Geo disclosure contract (optional for deploy-order compatibility)
  location_used: z.string().optional(),
  location_alternatives: z
    .array(z.object({ name: z.string(), code: z.number(), type: z.string() }))
    .optional(),
});

export const mapsDataSchema = z.object({
  results: z.array(
    z.object({
      rank: z.number(),
      name: z.string(),
      place_id: z.string(),
      rating: z.number().nullable(),
      reviews_count: z.number(),
      address: z.string(),
      phone: z.string(),
      website: z.string(),
      hours: z.unknown(),
      latitude: z.number().nullable(),
      longitude: z.number().nullable(),
      categories: z.array(z.string()),
    })
  ),
  total_results: z.number(),
  // Paid map pins, kept out of the ranked results (optional for
  // deploy-order compatibility)
  sponsored_results: z
    .array(z.object({ name: z.string(), rating: z.number().nullable(), reviews_count: z.number() }))
    .optional(),
  keyword: z.string(),
  // Actual keyword searched — differs from `keyword` when the
  // empty-result geo fallback re-anchored the search by appending the city.
  keyword_used: z.string().optional(),
  geo_fallback_applied: z.boolean().optional(),
  location: z.string(),
  location_resolved: z.string().optional(),
});

export const localFinderDataSchema = z.object({
  results: z.array(
    z.object({
      rank: z.number(),
      name: z.string(),
      rating: z.number().nullable(),
      reviews_count: z.number(),
      address: z.string(),
      phone: z.string(),
      hours: z.unknown(),
      website: z.string(),
      cid: z.string(),
    })
  ),
  total_results: z.number(),
  keyword: z.string(),
  location: z.string(),
  // Geo disclosure contract (optional for deploy-order compatibility)
  location_used: z.string().optional(),
  location_alternatives: z
    .array(z.object({ name: z.string(), code: z.number(), type: z.string() }))
    .optional(),
});

export const aiOverviewDataSchema = z.object({
  has_ai_overview: z.boolean(),
  asynchronous_ai_overview: z.boolean().optional().default(false),
  summary_text: z.string().nullable(),
  cited_sources: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      domain: z.string(),
      /** Order cited, from 1, counted after duplicate pages collapse.
       *  Optional for deploy-order compatibility — the CI job runs branch
       *  schemas against the LIVE API. */
      position: z.number().optional(),
    })
  ),
  keyword: z.string(),
  location: z.string(),
  // Geo disclosure contract (optional for deploy-order compatibility)
  location_used: z.string().optional(),
  location_alternatives: z
    .array(z.object({ name: z.string(), code: z.number(), type: z.string() }))
    .optional(),
});

export const aiModeDataSchema = z.object({
  ai_response: z.string().nullable(),
  /** Businesses Google recommended inside the answer, in the shape
   *  /v1/serp/local-pack uses so existing local-pack parsing works here
   *  unchanged, plus `cid`. Optional for deploy-order compatibility — the CI
   *  schema-validation job runs branch schemas against the LIVE API. */
  local_businesses: z.array(
    z.object({
      rank: z.number(),
      name: z.string(),
      category: z.string(),
      rating: z.number().nullable(),
      reviews_count: z.number(),
      address: z.string(),
      /** Always empty here: AI Mode renders a Call button and never sends
       *  the number. ai_scraper on chat_gpt does return E.164. */
      phone: z.string(),
      website: z.string(),
      domain: z.string(),
      /** Google's CID in decimal, read from the Directions link. Joinable
       *  with /v1/business/profile. */
      cid: z.string().optional(),
    })
  ).optional(),
  /** "ok", "no_businesses", or "unparsed" when business cards were present
   *  and none could be read — the signal that Google changed the format. */
  parse_status: z.enum(["ok", "no_businesses", "unparsed"]).optional(),
  references: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      domain: z.string(),
      /** Order cited, from 1, counted after duplicate pages collapse.
       *  Optional for deploy-order compatibility — the CI job runs branch
       *  schemas against the LIVE API. */
      position: z.number().optional(),
    })
  ),
  shopping_items: z.array(z.unknown()),
  keyword: z.string(),
  location: z.string(),
  // Geo disclosure contract (optional for deploy-order compatibility)
  location_used: z.string().optional(),
  location_alternatives: z
    .array(z.object({ name: z.string(), code: z.number(), type: z.string() }))
    .optional(),
});
