/**
 * Focused servers: a subset of the tools at its own path, e.g.
 * https://mcp.localseodata.com/reviews/mcp. Each one is a separate listing in
 * the MCP directories and gives agents a short tool list for one job. The
 * full server at /mcp is unchanged.
 *
 * Copy here must not use the phrase "<n> local SEO data tools": the
 * tool-count test reads that phrase as the full server's count.
 */

export type ToolsetSlug = "apple-bing" | "ai-visibility" | "reviews";

export interface Toolset {
  tools: readonly string[];
  name: string;
  title: string;
  description: string;
  instructions: string;
}

const CORE = ["get_balance", "location_search"] as const;

const APPLE_BING_TOOLS = [
  "apple_maps",
  "apple_business_profile",
  "bing_local",
  "bing_business_profile",
  ...CORE,
] as const;

const AI_VISIBILITY_TOOLS = [
  "ai_visibility",
  "ai_mentions",
  "ai_compare",
  "ai_top_sources",
  "ai_top_pages",
  "ai_llm_response",
  "ai_scraper",
  "ai_overview",
  "ai_mode",
  "ai_sample",
  "ai_sample_status",
  "ai_match",
  "ai_keyword_data",
  "history_search",
  "history_get",
  ...CORE,
] as const;

const REVIEWS_TOOLS = [
  "google_reviews",
  "review_velocity",
  "multi_platform_reviews",
  "reputation_audit",
  "qa",
  "business_profile",
  ...CORE,
] as const;

const FIRST_STEPS = `## First steps
1. get_balance (free) shows the credits left.
2. location_search (free) resolves a city when the format is unclear. Most tools accept "Buffalo, NY".`;

const CREDITS = `## Credits
Every response includes credits_used and credits_remaining. Sandbox keys (sk_test_*) return mock data and charge nothing. If a tool returns insufficient_credits, tell the user their balance and the cost.`;

export const TOOLSETS: Record<ToolsetSlug, Toolset> = {
  "apple-bing": {
    tools: APPLE_BING_TOOLS,
    name: "localseodata-apple-bing",
    title: "Local SEO Data: Apple Maps and Bing Places",
    description:
      "Apple Maps and Bing Places rankings and listing lookups for local businesses: who ranks for a keyword, NAP, claimed status, categories and coordinates.",
    instructions: `Local SEO Data, Apple Maps and Bing Places. ${APPLE_BING_TOOLS.length} tools for checking how a local business shows up on Apple Maps (Siri, iPhone) and Bing (Bing Places, Copilot).

${FIRST_STEPS}

## Tool selection
- Who ranks on Apple Maps for a keyword? apple_maps (3 cr)
- One business's Apple Maps listing, claimed or not? apple_business_profile (5 cr; 3 cr with the muid from a previous call)
- Who ranks in Bing's local results? bing_local (3 cr)
- One business's Bing Maps listing? bing_business_profile (3 cr)

## Reading results
- Apple claimed false means the listing was never claimed in Apple Business Connect: report it as a finding. claimed null means unknown; never report it as claimed.
- An Apple data_source (yelp, foursquare) means Apple took the record from that provider, so its website is that provider's page. That is not a NAP mismatch.
- Bing returns no ratings, review counts or claimed signal. rating null and claimed null are platform limits, not missing data.
- matched false on a profile lookup does not prove the business is absent. Check the ranking tool for the name Apple or Bing uses.
- A 502 saying results came from outside the requested location: retry once, then say the data is unavailable for that city. Never substitute another city.

${CREDITS} A full Apple and Bing check of one business is about 14 cr.`,
  },

  "ai-visibility": {
    tools: AI_VISIBILITY_TOOLS,
    name: "localseodata-ai-visibility",
    title: "Local SEO Data: AI Visibility",
    description:
      "See whether ChatGPT, Gemini, Claude, Perplexity, Google AI Overviews and AI Mode name a local business, how often, and which sources they cite.",
    instructions: `Local SEO Data, AI visibility. ${AI_VISIBILITY_TOOLS.length} tools for measuring whether AI assistants recommend a local business.

${FIRST_STEPS}

## Tool selection
- What does a specific model say? ai_llm_response (8 cr standard / 20 premium / 40 frontier; chat_gpt, claude, gemini, perplexity)
- Budget capture of an AI answer? ai_scraper (4 cr; chat_gpt, gemini)
- Google's AI Overview or full AI Mode answer? ai_overview (2 cr), ai_mode (2 cr)
- How OFTEN does an AI name a business? ai_sample to submit, ai_sample_status to collect (samples x 4 cr on chat_gpt/gemini, x 2 on google_ai_mode; polling is free)
- Is the business an AI named the one being tracked? ai_match (5 cr with the target lookup, 1 cr without)
- Is a brand mentioned in AI answers? ai_mentions (81-160 cr; chat_gpt, google)
- A domain's overall AI score? ai_visibility (81 cr)
- Compare domains? ai_compare (81 cr per domain)
- Which domains or pages do AIs cite most? ai_top_sources, ai_top_pages (81 cr each)
- AI search volume for keywords? ai_keyword_data (9-16 cr)
- Asked before? history_search then history_get (both free)

The 81 cr tools add up fast: ai_visibility, ai_mentions and ai_top_sources together are about 250 cr. Estimate the total and confirm with the user before running them.

## Reading results
- "Am I showing up in ChatGPT?" is a question about a rate. One ai_scraper or ai_mode call cannot answer it. Use ai_sample: it runs the prompt 2-25 times and returns appearance_rate, mean_rank and every run. Wait 30 seconds before the first ai_sample_status poll, and do not resubmit while a job is in flight; force_new: true asks for a genuine second measurement.
- Read appearance_rate out of samples_returned. Refusals are counted in samples_refused, not as the business being absent.
- In a sample, businesses is the platform listing and recommended_businesses is the shortlist read from the answer prose. Quote shortlist_rank and shortlist_rate when asked where an AI recommends someone. Gemini sends no listing, so an empty businesses array there means nothing.
- Do not compare names or domains yourself to decide whether an AI named a business. Pass the businesses array to ai_match.
- AI answers are point-in-time and cached for an hour. ai_overview, ai_mode, ai_llm_response and ai_scraper take fresh: true to skip the cache when sampling variance; do not set it on one-off lookups.
- Every response is stored. Check history_search before paying for the same answer again.
- AI tools are slow (ai_scraper 30-90 s, ai_llm_response 15-60 s, ai_mode and ai_overview 10-30 s). Do not retry one still in flight: that starts a second billable job.

${CREDITS}`,
  },

  reviews: {
    tools: REVIEWS_TOOLS,
    name: "localseodata-reviews",
    title: "Local SEO Data: Reviews and Reputation",
    description:
      "Read Google review text and owner replies, track review velocity and sentiment, compare ratings across platforms, and score a local business's reputation.",
    instructions: `Local SEO Data, reviews. ${REVIEWS_TOOLS.length} tools for reading and analysing a local business's reviews.

${FIRST_STEPS}

## Tool selection
- The business's Google profile, rating and review count? business_profile (5 cr)
- Review text and owner replies? google_reviews (1 cr per 10)
- Review growth and sentiment over time? review_velocity (6 cr)
- Ratings on Google and Trustpilot side by side? multi_platform_reviews (6 cr)
- Questions and answers on the listing? qa (5 cr)
- A reputation score with recommendations? reputation_audit (30 cr, confirm with the user first)

Typical check: business_profile, google_reviews, review_velocity (about 12 cr).

## Reading results
- For multi-location brands, get the store's place_id from business_profile first and pass it to google_reviews, review_velocity and multi_platform_reviews. Name and location lookups can return empty for chains.
- review_velocity and multi_platform_reviews take 10-30 seconds. That is normal, not an error.
- Review counts and ratings may lag Google's live display by a few hours.

${CREDITS}`,
  },
};

/**
 * Which toolset a request path asks for. null means the full server (/ and
 * any path starting /mcp, as before toolsets existed). undefined means the
 * path is not an MCP endpoint at all.
 */
export function resolveToolset(pathname: string): ToolsetSlug | null | undefined {
  if (pathname === "/" || pathname.startsWith("/mcp")) return null;
  const match = /^\/([a-z-]+)\/mcp\/?$/.exec(pathname);
  if (match && match[1] in TOOLSETS) return match[1] as ToolsetSlug;
  return undefined;
}
