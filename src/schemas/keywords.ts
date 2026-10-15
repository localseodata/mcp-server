import { z } from "zod";

// Volume/cpc/competition are nullable: null means "no data for this keyword",
// which is not the same as zero searches. location_used/volume_scope/
// data_source are optional (not required) so this schema also validates
// responses from deployments predating local Google Ads volumes — the CI
// schema-validation job runs branch schemas against the LIVE API.
export const searchVolumeDataSchema = z.object({
  keywords: z.array(
    z.object({
      keyword: z.string(),
      search_volume: z.number().nullable(),
      cpc: z.number().nullable(),
      competition: z.number().nullable(),
      competition_level: z.string().nullable(),
      monthly_searches: z.array(
        z.object({
          year: z.number().nullable(),
          month: z.number().nullable(),
          search_volume: z.number().nullable(),
        })
      ),
    })
  ),
  total_count: z.number(),
  location: z.string(),
  // Canonical location the volumes are actually scoped to
  location_used: z.string().optional(),
  // Sibling geo entities in the same state (e.g. "Hamilton Township" next to
  // "Hamilton") — different entities whose volumes can differ 3-5x
  location_alternatives: z
    .array(z.object({ name: z.string(), code: z.number(), type: z.string() }))
    .optional(),
  // "local" = city/state-level Google Ads data; "country" = national numbers
  volume_scope: z.enum(["local", "country"]).optional(),
  data_source: z.enum(["google_ads", "labs"]).optional(),
  language: z.string(),
  // Present only when local data was empty AND the country-level fallback
  // has no database in the requested language — says so instead of
  // substituting a different language or failing the request
  country_fallback_unavailable: z.string().optional(),
});

export const suggestionsDataSchema = z.object({
  seed_keyword: z
    .object({
      keyword: z.string(),
      search_volume: z.number().nullable(),
      keyword_difficulty: z.number().nullable(),
      cpc: z.number().nullable(),
      serp_features: z.array(z.string()),
    })
    .nullable(),
  suggestions: z.array(
    z.object({
      keyword: z.string(),
      search_volume: z.number().nullable(),
      keyword_difficulty: z.number().nullable(),
      cpc: z.number().nullable(),
      serp_features: z.array(z.string()),
    })
  ),
  total_count: z.number(),
  location: z.string(),
  // Geo disclosure contract (optional for deploy-order compatibility)
  location_used: z.string().optional(),
  location_alternatives: z
    .array(z.object({ name: z.string(), code: z.number(), type: z.string() }))
    .optional(),
  volume_scope: z.enum(["local", "country"]).optional(),
  data_source: z.string().optional(),
  // Language the data was actually pulled in (optional for
  // deploy-order compatibility — the CI job runs branch schemas against live)
  language: z.string().optional(),
});

// Keyword Overview: everything our keyword database holds on keywords the
// caller already has. Volume/cpc/competition are nullable (null = no data,
// not zero), and so are difficulty and intent — some rows come back
// with metrics missing for keywords that are known but not yet scored.
export const overviewDataSchema = z.object({
  keywords: z.array(
    z.object({
      keyword: z.string(),
      search_volume: z.number().nullable(),
      cpc: z.number().nullable(),
      competition: z.number().nullable(),
      competition_level: z.string().nullable(),
      monthly_searches: z.array(
        z.object({
          year: z.number().nullable(),
          month: z.number().nullable(),
          search_volume: z.number().nullable(),
        })
      ),
      keyword_difficulty: z.number().nullable(),
      search_intent: z.string().nullable(),
      secondary_intents: z.array(z.string()),
      // The full averaged link profile of the current top 10 — every
      // field comes back on the same lookup, so we return them all
      avg_backlinks: z.object({
        backlinks: z.number().nullable(),
        dofollow: z.number().nullable(),
        referring_pages: z.number().nullable(),
        referring_domains: z.number().nullable(),
        referring_main_domains: z.number().nullable(),
        rank: z.number().nullable(),
        main_domain_rank: z.number().nullable(),
      }),
    })
  ),
  total_count: z.number(),
  location: z.string(),
  location_used: z.string().optional(),
  volume_scope: z.enum(["local", "country"]).optional(),
  data_source: z.string().optional(),
  language: z.string().optional(),
});

export const forSiteDataSchema = z.object({
  keywords: z.array(
    z.object({
      keyword: z.string(),
      search_volume: z.number().nullable(),
      cpc: z.number().nullable(),
      competition: z.number().nullable(),
    })
  ),
  total_count: z.number(),
  domain: z.string(),
  location: z.string(),
  // Geo disclosure contract (optional for deploy-order compatibility)
  location_used: z.string().optional(),
  location_alternatives: z
    .array(z.object({ name: z.string(), code: z.number(), type: z.string() }))
    .optional(),
  volume_scope: z.enum(["local", "country"]).optional(),
  data_source: z.string().optional(),
  // Language the data was actually pulled in (optional for
  // deploy-order compatibility — the CI job runs branch schemas against live)
  language: z.string().optional(),
});

export const relatedDataSchema = z.object({
  keywords: z.array(
    z.object({
      keyword: z.string(),
      search_volume: z.number().nullable(),
      cpc: z.number().nullable(),
      competition: z.number().nullable(),
      competition_level: z.string().nullable().optional(),
    })
  ),
  total_count: z.number(),
  seed_keywords: z.array(z.string()),
  location: z.string(),
  // Geo disclosure contract (optional for deploy-order compatibility)
  location_used: z.string().optional(),
  location_alternatives: z
    .array(z.object({ name: z.string(), code: z.number(), type: z.string() }))
    .optional(),
  volume_scope: z.enum(["local", "country"]).optional(),
  data_source: z.string().optional(),
  // Language the data was actually pulled in (optional for
  // deploy-order compatibility — the CI job runs branch schemas against live)
  language: z.string().optional(),
});

export const trendsDataSchema = z.object({
  trends: z.array(
    z.object({
      keyword: z.string(),
      data_points: z.array(
        z.object({
          month: z.string(),
          // Same value as month; points are often weekly (optional for
          // deploy-order compatibility)
          date: z.string().optional(),
          interest: z.number(),
        })
      ),
      granularity: z.enum(["daily", "weekly", "monthly", "unknown"]).optional(),
      peak_month: z.string().nullable(),
      trend_direction: z.enum(["rising", "declining", "stable"]),
      has_data: z.boolean().optional(),
      partial_period_excluded: z.string().nullable().optional(),
    })
  ),
  total_count: z.number(),
  keywords: z.array(z.string()),
  location: z.string(),
  // Geo disclosure contract (optional for deploy-order compatibility)
  location_used: z.string().optional(),
  location_alternatives: z
    .array(z.object({ name: z.string(), code: z.number(), type: z.string() }))
    .optional(),
  volume_scope: z.enum(["local", "country"]).optional(),
  data_source: z.string().optional(),
  period: z.string(),
});
