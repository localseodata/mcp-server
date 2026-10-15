import { z } from "zod";

export const mentionsDataSchema = z.object({
  ai_search_volume: z.number(),
  total_mentions: z.number(),
  mentions: z.array(
    z.object({
      question: z.string(),
      answer_snippet: z.string(),
      sources_cited: z.array(z.string()),
      platform: z.string(),
      date: z.string().nullable(),
    })
  ),
  // Market disclosure: the country, language and AI platforms the numbers
  // actually cover. Optional for deploy-order compatibility — the CI
  // schema-validation job runs branch schemas against the LIVE API.
  location_used: z.string().optional(),
  /** Always "country" on the mention endpoints: our mention data is
   *  country-scoped, so a city in `location` resolves to its country and the
   *  numbers cover all of it. Optional for deploy-order compatibility — the
   *  CI schema-validation job runs branch schemas against the LIVE API. */
  location_scope: z.enum(["local", "country"]).optional(),
  language: z.string().optional(),
  platforms_available: z.array(z.string()).optional(),
});

export const topSourcesDataSchema = z.object({
  keyword: z.string(),
  top_domains: z.array(
    z.object({
      domain: z.string(),
      mentions: z.number(),
      ai_search_volume: z.number(),
    })
  ),
  // Market disclosure: the country, language and AI platforms the numbers
  // actually cover. Optional for deploy-order compatibility — the CI
  // schema-validation job runs branch schemas against the LIVE API.
  location_used: z.string().optional(),
  /** Always "country" on the mention endpoints: our mention data is
   *  country-scoped, so a city in `location` resolves to its country and the
   *  numbers cover all of it. Optional for deploy-order compatibility — the
   *  CI schema-validation job runs branch schemas against the LIVE API. */
  location_scope: z.enum(["local", "country"]).optional(),
  language: z.string().optional(),
  platforms_available: z.array(z.string()).optional(),
});

export const topPagesDataSchema = z.object({
  keyword: z.string(),
  top_pages: z.array(
    z.object({
      url: z.string(),
      domain: z.string(),
      mentions: z.number(),
      ai_search_volume: z.number(),
    })
  ),
  // Market disclosure: the country, language and AI platforms the numbers
  // actually cover. Optional for deploy-order compatibility — the CI
  // schema-validation job runs branch schemas against the LIVE API.
  location_used: z.string().optional(),
  /** Always "country" on the mention endpoints: our mention data is
   *  country-scoped, so a city in `location` resolves to its country and the
   *  numbers cover all of it. Optional for deploy-order compatibility — the
   *  CI schema-validation job runs branch schemas against the LIVE API. */
  location_scope: z.enum(["local", "country"]).optional(),
  language: z.string().optional(),
  platforms_available: z.array(z.string()).optional(),
});

export const visibilityDataSchema = z.object({
  domain: z.string(),
  total_mentions: z.number(),
  total_impressions: z.number(),
  ai_search_volume: z.number(),
  platform_breakdown: z.record(
    z.string(),
    z.object({
      mentions: z.number(),
      ai_search_volume: z.number(),
      impressions: z.number(),
    })
  ),
  top_sources: z.array(
    z.object({
      domain: z.string(),
      mentions: z.number(),
      impressions: z.number(),
    })
  ),
  // Market disclosure: the country, language and AI platforms the numbers
  // actually cover. Optional for deploy-order compatibility — the CI
  // schema-validation job runs branch schemas against the LIVE API.
  location_used: z.string().optional(),
  /** Always "country" on the mention endpoints: our mention data is
   *  country-scoped, so a city in `location` resolves to its country and the
   *  numbers cover all of it. Optional for deploy-order compatibility — the
   *  CI schema-validation job runs branch schemas against the LIVE API. */
  location_scope: z.enum(["local", "country"]).optional(),
  language: z.string().optional(),
  platforms_available: z.array(z.string()).optional(),
});

export const compareDataSchema = z.object({
  keywords: z.array(z.string()),
  by_domain: z.array(
    z.object({
      domain: z.string(),
      total_mentions: z.number(),
      total_impressions: z.number(),
      ai_search_volume: z.number(),
    })
  ),
  // Market disclosure: the country, language and AI platforms the numbers
  // actually cover. Optional for deploy-order compatibility — the CI
  // schema-validation job runs branch schemas against the LIVE API.
  location_used: z.string().optional(),
  /** Always "country" on the mention endpoints: our mention data is
   *  country-scoped, so a city in `location` resolves to its country and the
   *  numbers cover all of it. Optional for deploy-order compatibility — the
   *  CI schema-validation job runs branch schemas against the LIVE API. */
  location_scope: z.enum(["local", "country"]).optional(),
  language: z.string().optional(),
  platforms_available: z.array(z.string()).optional(),
});

export const keywordDataSchema = z.object({
  total_keywords: z.number(),
  keywords: z.array(
    z.object({
      keyword: z.string(),
      ai_search_volume: z.number(),
      monthly_searches: z.array(z.unknown()),
    })
  ),
  location: z.string().optional(),
  location_used: z.string().optional(),
  volume_scope: z.enum(["local", "country"]).optional(),
  // The language the AI volumes were pulled in
  language: z.string().optional(),
});

export const llmResponseDataSchema = z.object({
  platform: z.string(),
  prompt: z.string(),
  response_text: z.string(),
  model: z.string().nullable(),
  /** Whether the model actually searched the web, as reported by the
   *  platform. Requesting a search does not guarantee one happened. */
  web_search_used: z.boolean().optional().default(false),
  sources: z.array(
    z.object({
      url: z.string(),
      title: z.string(),
      domain: z.string(),
      /** Order cited, from 1, counted after duplicate pages collapse.
       *  Optional for deploy-order compatibility — the CI job runs branch
       *  schemas against the LIVE API. */
      position: z.number().optional(),
    })
  ),
  fan_out_queries: z.array(z.string()),
});

/** One business an AI answer put on its shortlist. Shared by the ai_scraper
 *  and the sampling shapes, which read it from the same prose. */
const recommendedBusinessSchema = z.object({
  /** The place the answer's own list gave this business, from 1 — null when
   *  the answer named it outside its list. Nullable rather than absent so a
   *  caller can tell "named in passing" from "field not populated". */
  shortlist_rank: z.number().nullable(),
  /** Whether this came from an entry in a list the answer presented. Optional
   *  for the same deploy-window reason as the fields below. */
  listed: z.boolean().optional(),
  /** The answer's own words where it introduced this business. */
  mention: z.string().optional(),
  name: z.string(),
  is_top_pick: z.boolean(),
  citation: z.object({ url: z.string(), domain: z.string() }),
});

export const scraperDataSchema = z.object({
  keyword: z.string(),
  platform: z.string(),
  model: z.string().nullable(),
  markdown: z.string(),
  // Optional because this schema validates real API responses — from the
  // deployed API in scripts/test-endpoints.ts, from cached payloads in the
  // sandbox, and from whatever the MCP server receives. A newly added field
  // is absent from all of those until the change is deployed, and stays
  // absent from anything cached before that deploy for the length of the
  // cache TTL. The route always populates it, so callers on a current
  // deployment always receive an array. Optional describes what a validator
  // may encounter, not what the endpoint promises.
  local_businesses: z.array(
    z.object({
      rank: z.number(),
      name: z.string(),
      category: z.string(),
      rating: z.number().nullable(),
      reviews_count: z.number(),
      address: z.string(),
      phone: z.string(),
      website: z.string(),
      domain: z.string(),
    })
  ).optional(),
  // The shortlist the answer argues for, as opposed to the block of results
  // above it — a different ranking of different things, and on gemini the
  // only one there is. Optional for the reason given above local_businesses.
  recommended_businesses: z.array(recommendedBusinessSchema).optional(),
  /** Which version of the prose reader produced recommended_businesses. The
   *  shortlist is our reading of the answer, not the platform's listing, and responses
   *  are stored and replayed by history_get — two rows read at different
   *  versions are not comparable. Absent means the row predates versioning. */
  reader_version: z.number().optional(),
  search_results: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      domain: z.string(),
      description: z.string(),
    })
  ),
  sources: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      domain: z.string(),
      snippet: z.string(),
      position: z.number().optional(),
    })
  ),
  fan_out_queries: z.array(z.string()),
  brand_entities: z.array(
    z.object({
      title: z.string(),
      category: z.string(),
    })
  ),
});

// ─── AI Sampling (/v1/ai/sample) ────────────────────────────────────────────

/** The job receipt the live API returns: sampling runs the prompt
 *  `samples` times, so it is queued rather than answered inline. */
export const sampleSubmitDataSchema = z.object({
  job_id: z.string(),
  status: z.string(),
  samples_requested: z.number(),
  estimated_seconds: z.number(),
  poll_url: z.string(),
  /** Present and true when this submit was recognised as a repeat of one
   *  already in flight, and started nothing. */
  deduplicated: z.boolean().optional(),
});

const sampledBusinessSchema = z.object({
  name: z.string(),
  matched_on: z.enum(["cid", "domain", "name"]),
  cid: z.string(),
  domain: z.string(),
  category: z.string(),
  rating: z.number().nullable(),
  reviews_count: z.number(),
  address: z.string(),
  phone: z.string(),
  website: z.string(),
  appearances: z.number(),
  appearance_rate: z.number(),
  // Optional through the deploy window, not because they are sometimes
  // missing afterwards. The API and the MCP server are separate services
  // that deploy independently, and this schema is the MCP tool's
  // outputSchema: a field required here but not yet sent by the API makes
  // the SDK throw "Output validation error" AFTER the HTTP call has been
  // made and the credits spent — see tools/output-schema.test.ts. The same
  // property is what lets the schema-validation job check this branch
  // against the currently deployed API. Tighten once both sides are live.
  /** Every spelling the answers used, when they used more than one — the
   *  record of which rows were folded together. */
  name_variants: z.array(z.string()).optional(),
  /** Which source the answers cited for this business, and in how many runs.
   *  Most-used first. */
  cited_domains: z.array(z.object({ domain: z.string(), runs: z.number() })).optional(),
  listing_appearances: z.number().optional(),
  shortlist_appearances: z.number().optional(),
  shortlist_rate: z.number().optional(),
  mention_appearances: z.number().optional(),
  top_pick_count: z.number().optional(),
  // Null whenever the business was never in a structured listing — every
  // business on gemini, and anyone the prose named that the listing did not.
  best_rank: z.number().nullable(),
  worst_rank: z.number().nullable(),
  mean_rank: z.number().nullable(),
  best_shortlist_rank: z.number().nullable().optional(),
  mean_shortlist_rank: z.number().nullable().optional(),
  runs_seen: z.array(z.number()),
});

const sampleRunSchema = z.object({
  run: z.number(),
  ok: z.boolean(),
  // Optional for the same deploy-window reason as the business fields above.
  outcome: z.enum(["answered", "refused", "unreadable", "error"]).optional(),
  outcome_reason: z
    .enum(["declined", "clarifying_question", "no_answer", "unreadable_layout"])
    .optional(),
  shortlist_read: z.boolean().optional(),
  recommended_businesses: z.array(recommendedBusinessSchema).optional(),
  businesses: z.array(
    z.object({
      rank: z.number(),
      name: z.string(),
      category: z.string(),
      rating: z.number().nullable(),
      reviews_count: z.number(),
      address: z.string(),
      phone: z.string(),
      website: z.string(),
      domain: z.string(),
      cid: z.string().optional(),
    })
  ),
  response_text: z.string().nullable(),
  error: z.string().optional(),
});

/** The finished sample, as /v1/ai/sample/status returns it once the job is
 *  complete — and as a sandbox key gets it inline. */
export const sampleCompletedDataSchema = z.object({
  job_id: z.string().optional(),
  status: z.string().optional(),
  keyword: z.string(),
  platform: z.string(),
  location: z.string().optional(),
  /** What the job reserved, what came back, and what it therefore cost. The
   *  status poll itself is free, so credits_used on that response is 0 and
   *  these are the figures that answer "what did this cost me?". */
  credits_reserved: z.number().optional(),
  credits_refunded: z.number().optional(),
  credits_charged: z.number().optional(),
  samples_requested: z.number(),
  samples_returned: z.number(),
  samples_failed: z.number(),
  samples_refused: z.number().optional(),
  samples_unreadable: z.number().optional(),
  samples_shortlist_read: z.number().optional(),
  /** Which version of the prose reader produced recommended_businesses. The
   *  shortlist is our reading of the answer, not the platform's listing, and responses
   *  are stored and replayed by history_get — two rows read at different
   *  versions are not comparable. Absent means the row predates versioning. */
  reader_version: z.number().optional(),
  businesses: z.array(sampledBusinessSchema),
  runs: z.array(sampleRunSchema),
  completed_at: z.string().nullable().optional(),
});

/** A status poll, which can land on a job that is queued, running, finished
 *  or failed. One object rather than a union, because the SDK silently drops a
 *  union outputSchema — and a schema narrower than the answers the endpoint
 *  can give throws AFTER the call, which on a poll would strand a caller on
 *  top of a job they have already paid for. */
export const sampleStatusDataSchema = sampleCompletedDataSchema.partial().extend({
  job_id: z.string(),
  status: z.string(),
  progress: z.number().optional(),
  total_steps: z.number().optional(),
  error: z.string().nullable().optional(),
});

// ─── Entity matching (/v1/ai/match) ─────────────────────────────────────────

const matchTargetSchema = z.object({
  business_name: z.string(),
  /** "business_profile" means the identifiers below came from a profile
   *  lookup rather than the request — which is what makes a name-only target
   *  matchable on a cid, a domain and a phone. */
  resolved_from: z.enum(["request", "business_profile", "not_found"]),
  cid: z.string(),
  domain: z.string(),
  website: z.string(),
  phone: z.string(),
  address: z.string(),
});

const matchSignal = z.enum(["cid", "domain", "phone", "name_address", "name", "none"]);

const sourceGraph = z.enum(["google", "bing", "yelp", "aggregator", "unknown"]);

/** How much of the answer could be identified at all, and which platforms'
 *  records it was repeating. Reported whatever the verdict: a miss against
 *  low coverage is a different fact from a miss against full coverage. */
const identifierCoverageSchema = z.object({
  candidates: z.number(),
  with_cid: z.number(),
  with_domain: z.number(),
  with_phone: z.number(),
  with_address: z.number(),
  identified: z.number(),
  coverage_rate: z.number(),
  by_source: z.object({
    google: z.number(),
    bing: z.number(),
    yelp: z.number(),
    aggregator: z.number(),
    unknown: z.number(),
  }),
});

/** Provenance, NOT a warning: a business legitimately exists on more than one
 *  platform, and two spellings of it are the normal state of the world. */
const entityVariantSchema = z.object({
  name: z.string(),
  address: z.string(),
  phone: z.string(),
  website: z.string(),
  domain: z.string(),
  cid: z.string(),
  source_graph: sourceGraph,
  runs_seen: z.array(z.number()),
});

/** A value that genuinely contradicts the client's own record. This one IS a
 *  fault, which is why it is kept out of entity_variants. */
const napConflictSchema = z.object({
  field: z.enum(["phone", "address"]),
  expected: z.string(),
  found: z.string(),
  source_graph: sourceGraph,
  runs_seen: z.array(z.number()),
});

const matchVerdictSchema = z.object({
  matched: z.boolean(),
  confidence: z.number(),
  matched_on: matchSignal,
  rank: z.number().nullable(),
  match: z.record(z.string(), z.unknown()).nullable(),
  candidates: z.array(
    z.object({
      name: z.string(),
      score: z.number(),
      matched_on: matchSignal,
      rank: z.number().nullable(),
    })
  ),
});

/** One answer checked against one business. */
export const matchDataSchema = matchVerdictSchema.extend({
  target: matchTargetSchema,
  // Optional through the deploy window — see the note on
  // sampledBusinessSchema above.
  identifier_coverage: identifierCoverageSchema.optional(),
  entity_variants: z.array(entityVariantSchema).optional(),
  nap_conflicts: z.array(napConflictSchema).optional(),
});

/** Both shapes in one object, every shape-specific field optional.
 *
 *  For the MCP tool's outputSchema, which the SDK only accepts as an OBJECT:
 *  handed a z.union it drops the schema entirely and silently, so the tool
 *  ships with no output validation at all. A union was also wrong the other
 *  way — declaring only the single-answer shape made the SDK reject every
 *  `runs` response as invalid output after the call had been billed. This
 *  validates what the two shapes share and admits either. */
export const matchAnyDataSchema = z.object({
  target: matchTargetSchema,
  identifier_coverage: identifierCoverageSchema.optional(),
  entity_variants: z.array(entityVariantSchema).optional(),
  nap_conflicts: z.array(napConflictSchema).optional(),
  matched: z.boolean().optional(),
  confidence: z.number().optional(),
  matched_on: matchSignal.optional(),
  rank: z.number().nullable().optional(),
  match: z.record(z.string(), z.unknown()).nullable().optional(),
  candidates: z
    .array(
      z.object({
        name: z.string(),
        score: z.number(),
        matched_on: matchSignal,
        rank: z.number().nullable(),
      })
    )
    .optional(),
  runs_checked: z.number().optional(),
  appearances: z.number().optional(),
  appearance_rate: z.number().optional(),
  best_rank: z.number().nullable().optional(),
  worst_rank: z.number().nullable().optional(),
  mean_rank: z.number().nullable().optional(),
  runs: z.array(matchVerdictSchema.extend({ run: z.number() })).optional(),
});

/** A whole sample checked against one business: the rate, plus the verdict
 *  for every run behind it. */
export const matchRunsDataSchema = z.object({
  target: matchTargetSchema,
  identifier_coverage: identifierCoverageSchema.optional(),
  entity_variants: z.array(entityVariantSchema).optional(),
  nap_conflicts: z.array(napConflictSchema).optional(),
  runs_checked: z.number(),
  appearances: z.number(),
  appearance_rate: z.number(),
  best_rank: z.number().nullable(),
  worst_rank: z.number().nullable(),
  mean_rank: z.number().nullable(),
  runs: z.array(matchVerdictSchema.extend({ run: z.number() })),
});
