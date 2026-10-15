import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callApi, callApiGet, formatResult, withErrorHandling } from "../api-client.js";
import {
  mentionsDataSchema,
  topSourcesDataSchema,
  topPagesDataSchema,
  visibilityDataSchema,
  compareDataSchema,
  keywordDataSchema,
  llmResponseDataSchema,
  scraperDataSchema,
  sampleSubmitDataSchema,
  sampleStatusDataSchema,
  matchAnyDataSchema,
} from "../schemas/ai-visibility.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

export function registerAIVisibilityTools(server: McpServer, getAuth: () => string) {
  server.registerTool(
    "ai_mentions",
    {
      description: "Use when finding where a keyword appears in ChatGPT and Google AI outputs. Returns ai_search_volume, total_mentions, and mention details with question, answer_snippet, sources_cited, and platform. IMPORTANT: results are country-level (location_scope: \"country\") regardless of the location passed — a city resolves to its country and the numbers cover all of it. Check location_used. For city-level AI results use ai_scraper or ai_mode. Costs 88 credits.",
      inputSchema: {
        keyword: z.string().min(1).describe('Keyword to search for (e.g. "best plumber in Buffalo")'),
        location: z.string().optional().describe('Location for results (e.g. "Portland, OR"). Default: US'),
        platforms: z.array(z.enum(["chat_gpt", "google"])).optional().describe("Platforms to query. Default: all"),
        language: z.string().optional().describe('Language as ISO 639-1 code or name (e.g. "fr", "French"). Defaults to English wherever we hold English AI data for that country, and to the largest database that country has otherwise.'),
        limit: z.number().int().min(1).max(100).optional().describe("Max mentions. Default: 10, max: 100"),
      },
      outputSchema: mentionsDataSchema,
      annotations: { ...READ_ONLY, title: "AI Search Mentions" },
    },
    withErrorHandling(async ({ keyword, location, platforms, limit, language }) => {
      const result = await callApi(
        "/v1/ai/mentions",
        { keyword, ...(location && { location }), ...(platforms && { platforms }), ...(limit && { limit }), ...(language && { language }) },
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "ai_top_sources",
    {
      description: "Discovers which domains AI models cite most for a topic. Returns top_domains with domain, mentions count, and ai_search_volume. Reports at the domain level; ai_top_pages reports individual pages. IMPORTANT: results are country-level (location_scope: \"country\") regardless of the location passed — a city resolves to its country and the numbers cover all of it. Check location_used. For city-level AI results use ai_scraper or ai_mode. Costs 81 credits.",
      inputSchema: {
        keyword: z.string().min(1).describe('Keyword to search for (e.g. "plumber near me")'),
        location: z.string().optional().describe('Location for results (e.g. "Seattle, WA"). Default: US'),
        platforms: z.array(z.enum(["chat_gpt", "google"])).optional().describe("Platforms to query. Default: all"),
        language: z.string().optional().describe('Language as ISO 639-1 code or name (e.g. "fr", "French"). Defaults to English wherever we hold English AI data for that country, and to the largest database that country has otherwise.'),
        limit: z.number().int().min(1).max(20).optional().describe("Max domains. Default: 10, max: 20"),
      },
      outputSchema: topSourcesDataSchema,
      annotations: { ...READ_ONLY, title: "Top AI-Cited Domains" },
    },
    withErrorHandling(async ({ keyword, location, platforms, limit, language }) => {
      const result = await callApi(
        "/v1/ai/top-sources",
        { keyword, ...(location && { location }), ...(platforms && { platforms }), ...(limit && { limit }), ...(language && { language }) },
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "ai_top_pages",
    {
      description: "Use when finding specific pages (not just domains) that AI models reference most. Returns top_pages with url, domain, mentions, and ai_search_volume. More granular than ai_top_sources. IMPORTANT: results are country-level (location_scope: \"country\") regardless of the location passed — a city resolves to its country and the numbers cover all of it. Check location_used. For city-level AI results use ai_scraper or ai_mode. Costs 81 credits.",
      inputSchema: {
        keyword: z.string().min(1).describe('Keyword to search for (e.g. "best dentist")'),
        location: z.string().optional().describe('Location for results (e.g. "Chicago, IL"). Default: US'),
        platforms: z.array(z.enum(["chat_gpt", "google"])).optional().describe("Platforms to query. Default: all"),
        language: z.string().optional().describe('Language as ISO 639-1 code or name (e.g. "fr", "French"). Defaults to English wherever we hold English AI data for that country, and to the largest database that country has otherwise.'),
        limit: z.number().int().min(1).max(50).optional().describe("Max pages. Default: 10, max: 50"),
      },
      outputSchema: topPagesDataSchema,
      annotations: { ...READ_ONLY, title: "Top AI-Cited Pages" },
    },
    withErrorHandling(async ({ keyword, location, platforms, limit, language }) => {
      const result = await callApi(
        "/v1/ai/top-pages",
        { keyword, ...(location && { location }), ...(platforms && { platforms }), ...(limit && { limit }), ...(language && { language }) },
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "ai_visibility",
    {
      description: "Measures a single domain's overall AI citation score across platforms. Returns total_mentions, total_impressions, ai_search_volume, and platform_breakdown (chat_gpt, google). Covers one domain; ai_compare covers several side by side. IMPORTANT: results are country-level (location_scope: \"country\") regardless of the location passed — a city resolves to its country and the numbers cover all of it. Check location_used. For city-level AI results use ai_scraper or ai_mode. Costs 81 credits.",
      inputSchema: {
        domain: z.string().min(1).describe('Domain to analyze (e.g. "example.com")'),
        keywords: z.array(z.string().min(1)).min(1).max(10).describe("Keywords to check visibility for"),
        location: z.string().optional().describe('Location for results (e.g. "Austin, TX"). Default: US'),
        platforms: z.array(z.enum(["chat_gpt", "google"])).optional().describe("Platforms to query. Default: all"),
        language: z.string().optional().describe('Language as ISO 639-1 code or name (e.g. "fr", "French"). Defaults to English wherever we hold English AI data for that country, and to the largest database that country has otherwise.'),
      },
      outputSchema: visibilityDataSchema,
      annotations: { ...READ_ONLY, title: "Domain AI Visibility Score" },
    },
    withErrorHandling(async ({ domain, keywords, location, platforms, language }) => {
      const result = await callApi(
        "/v1/ai/visibility",
        { domain, keywords, ...(location && { location }), ...(platforms && { platforms }), ...(language && { language }) },
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "ai_compare",
    {
      description: "Compares 2–5 domains' AI visibility side by side. Returns per-domain total_mentions, total_impressions, and ai_search_volume. For one domain's detailed platform breakdown, see ai_visibility. IMPORTANT: results are country-level (location_scope: \"country\") regardless of the location passed — a city resolves to its country and the numbers cover all of it. Check location_used. For city-level AI results use ai_scraper or ai_mode. Costs 81 credits per domain compared (2 domains = 162).",
      inputSchema: {
        domains: z.array(z.string().min(1)).min(2).max(5).describe('Domains to compare (e.g. ["yoursite.com", "competitor.com"])'),
        keywords: z.array(z.string().min(1)).min(1).max(10).describe("Keywords to compare across"),
        location: z.string().optional().describe('Location for results (e.g. "Denver, CO"). Default: US'),
        language: z.string().optional().describe('Language as ISO 639-1 code or name (e.g. "fr", "French"). Defaults to English wherever we hold English AI data for that country, and to the largest database that country has otherwise.'),
      },
      outputSchema: compareDataSchema,
      annotations: { ...READ_ONLY, title: "Compare AI Visibility" },
    },
    withErrorHandling(async ({ domains, keywords, location, language }) => {
      const result = await callApi(
        "/v1/ai/compare",
        { domains, keywords, ...(location && { location }), ...(language && { language }) },
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "ai_keyword_data",
    {
      description: "Use when measuring how often keywords are searched in ChatGPT and other LLMs. Returns ai_search_volume and monthly trend data per keyword. IMPORTANT: volumes are country-level (volume_scope: \"country\") regardless of the location passed — check location_used. Costs 9-16 credits, scaling with keyword count (100 keywords = 16).",
      inputSchema: {
        keywords: z.array(z.string().min(1)).min(1).max(100).describe('Keywords to get AI volume for (e.g. ["plumber near me", "emergency plumber"])'),
        location: z.string().optional().describe('Location for results (e.g. "Miami, FL"). Default: US'),
        language: z.string().optional().describe('Language as ISO 639-1 code or name (e.g. "fr", "French"). Defaults to the language we hold AI keyword data for in that country.'),
      },
      outputSchema: keywordDataSchema,
      annotations: { ...READ_ONLY, title: "AI Search Volume" },
    },
    withErrorHandling(async ({ keywords, location, language }) => {
      const result = await callApi(
        "/v1/ai/keyword-data",
        { keywords, ...(location && { location }), ...(language && { language }) },
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "ai_llm_response",
    {
      description: "Gets what a specific LLM says about a query. Returns response_text, the model used, sources with URLs, fan_out_queries, and web_search_used. Each source carries a position — the order it was cited, from 1, counted after duplicate pages collapse. Supports chat_gpt, claude, gemini, perplexity.\n\nWHETHER YOU GET SOURCES depends on whether the model searched the web. perplexity searches on every call, so its sources are populated and it needs no parameters. The other three answer from training data unless you set web_search: true, and on local business questions they otherwise do not search at all.\n\nWEB SEARCH SUPPORT DIFFERS BY PLATFORM. claude takes web_search, force_web_search, search_country and search_city — the full set. chat_gpt takes all four except that GPT-5 models drop force_web_search. gemini takes web_search only: a search can be permitted but never compelled, and it cannot be geographically scoped. perplexity takes search_country only and cannot be switched off. Asking for something a platform does not support returns a 400 saying what it does support.\n\nCOST: 8 credits, or 20/40 if model pins a premium/frontier model. With web_search: true it is priced from the measured cost of searching — 24 for chat_gpt, 27 for gemini, 40 for claude. perplexity stays at 8 with search included.\n\nACCURACY WARNING: without web search a model may state confident, wrong facts about a local business, including that an open business has closed. When checking what a model says about a real business, use a platform that searches: perplexity, or any platform with web_search: true.\n\nMATCHING CITATIONS ON GEMINI: domain is the registrable domain and never the subdomain, because Google's grounding data does not transmit one — a client at orangecounty.example.com is reported as example.com. Match on the registrable domain for subdomain-hosted sites. The other three platforms return the full hostname.\n\nSampling settings are left at each platform's defaults, which differ and are not all low, so repeating a prompt returns different wording — treat one run as a sample, not a fixed answer.\n\nMay take 15-60 seconds; with web_search: true, expect the upper end.",
      inputSchema: {
        prompt: z.string().min(1).max(500).describe('Prompt to send to the LLM (e.g. "What is the best plumber in Portland?"). Max 500 characters.'),
        platform: z.enum(["chat_gpt", "claude", "gemini", "perplexity"]).describe("Which LLM to query"),
        model: z.string().max(100).optional().describe("Optional model name (e.g. gpt-5.4-mini, claude-sonnet-5, claude-opus-5, gemini-3.8-flash, sonar). Defaults to the newest standard-tier model for each platform at 8 credits. Pinning changes the cost: standard 8 credits, premium (Opus-class) 20, frontier (Fable-class) 40; an unrecognised model bills at the frontier rate. An unsupported value returns a 400 listing what the platform accepts."),
        web_search: z.boolean().optional().describe("Let the model search the web before answering, so it can cite sources. Strongly recommended when asking about a real business — without it models answer from training data and can assert an open business has closed. Not accepted on perplexity, which always searches. Raises the price to the measured cost of searching: 24 credits chat_gpt, 27 gemini, 40 claude."),
        force_web_search: z.boolean().optional().describe("Require the search rather than leaving it to the model's judgement. Requires web_search: true. Accepted on claude, and on chat_gpt only for non-GPT-5 models. Not available on gemini or perplexity. In testing it changed which sources were retrieved more than what the answer said, so reach for it when you need a search guaranteed, not for better answers."),
        search_country: z.string().length(2).optional().describe('ISO 3166-1 alpha-2 country to search from, e.g. "US". Accepted on chat_gpt, claude and perplexity; not on gemini.'),
        search_city: z.string().max(100).optional().describe('City to search from, e.g. "Wichita". Grounds the search where the customer actually is, which is usually the point for local work. Accepted on chat_gpt and claude only.'),
        fresh: z.boolean().optional().describe("Bypass the hour of caching and run the query again. Use when sampling the same prompt repeatedly to measure how the answer varies — a cached hit would return the earlier run and hide the variance. Always billed at the normal price, since there is no cache hit to be free."),
      },
      outputSchema: llmResponseDataSchema,
      annotations: { ...READ_ONLY, title: "Direct LLM Response" },
    },
    withErrorHandling(async ({ prompt, platform, model, web_search, force_web_search, search_country, search_city, fresh }) => {
      const result = await callApi(
        "/v1/ai/llm-response",
        { prompt, platform, model, web_search, force_web_search, search_country, search_city, ...(fresh && { fresh }) },
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "ai_scraper",
    {
      description: "Use when scraping ChatGPT or Gemini search results for a keyword. Returns markdown response, local_businesses, sources, fan_out_queries, and brand_entities. Each entry in sources carries a position — the order it was cited, from 1, after duplicates collapse. Costs 4 credits.\n\nTWO RANKINGS, DO NOT MERGE THEM: local_businesses is the platform's LISTING, in the order it emitted cards. recommended_businesses is the SHORTLIST read out of the answer's own prose, in the order the answer argued for it, with shortlist_rank, listed, mention, is_top_pick and the citation offered beside each entry. listed: true means the entry held a place in a list the answer presented and shortlist_rank is that place; listed: false means the answer named it in a sentence instead, so shortlist_rank is null rather than a position it never had. mention is the answer's own words about the business, plain text \u2014 the evidence behind the row. They disagree routinely — ChatGPT opens a local answer by dumping its whole result set and only then writes the list it recommends, so a business the prose puts third can sit tenth in the array. Quote shortlist_rank when a client asks where an AI RECOMMENDS them.\n\nGEMINI HAS NO LISTING AT ALL: it sends no business block, so local_businesses is empty on every gemini local query and recommended_businesses is the only place a business appears. An empty array on gemini is not evidence that nobody was named.\n\nLOCAL BUSINESSES: on a local question, chat_gpt lists businesses inside its answer and we return them as local_businesses — rank, name, category, rating, reviews_count, address, phone, website, domain. Field names it shares with /v1/serp/local-pack mean the same things, so code reading those works against both — but the sets differ: this adds category and domain, and has no cid or hours. gemini has no equivalent and returns an empty array — read recommended_businesses there.\n\nFORCE A SEARCH ON CHAT_GPT: chat_gpt sometimes answers a local prompt with a clarifying question (\"which Orange County do you mean?\") instead of an answer, which reads as an empty result. force_web_search: true makes it answer, at the same 4 credits, and is what makes the local_businesses block appear reliably. gemini decides for itself and returns a 400 if you ask.\n\nMATCHING CITATIONS ON GEMINI: local answers often cite Google Business Profiles, which arrive with domain \"maps.google.com\" and the business name in title, identified by the cid in the URL. Match on title or cid rather than domain for those.\n\nsearch_results is a reserved field we have not observed populated on either platform — read sources. fan_out_queries and brand_entities depend on the query and platform and are often empty.\n\nSLOW: we ask ChatGPT or Gemini the question live and wait for the full answer. May take 30-90 seconds. This is normal, not an error — do not retry a call still in flight, it starts a second billable job.",
      inputSchema: {
        keyword: z.string().min(1).describe('Keyword to scrape results for (e.g. "best electrician")'),
        platform: z.enum(["chat_gpt", "gemini"]).describe("Which platform to scrape (chat_gpt or gemini)"),
        location: z.string().optional().describe('Location for results (e.g. "Boston, MA"). Gemini supports city-level; ChatGPT resolves to country. Default: US'),
        force_web_search: z.boolean().optional().describe("Require the platform to search the web before answering. chat_gpt only; gemini returns a 400. Does not change the price. Reach for it when a local prompt comes back as a clarifying question rather than an answer."),
        language: z.string().optional().describe('Language to ask in, as ISO 639-1 code or name (e.g. "fr", "French"). Defaults to the language of the market you pass — a French location is asked in French. This tool queries the model live and covers 43 languages worldwide, so this is not limited the way the AI mention endpoints are.'),
        fresh: z.boolean().optional().describe("Bypass the hour of caching and run the query again. Use when sampling the same prompt repeatedly to measure how the answer varies — a cached hit would return the earlier run and hide the variance. Always billed at the normal price, since there is no cache hit to be free."),
      },
      outputSchema: scraperDataSchema,
      annotations: { ...READ_ONLY, title: "AI Result Scraper" },
    },
    withErrorHandling(async ({ keyword, platform, location, force_web_search, language, fresh }) => {
      const result = await callApi(
        "/v1/ai/scraper",
        {
          keyword,
          platform,
          ...(location && { location }),
          ...(force_web_search && { force_web_search }),
          ...(language && { language }),
          ...(fresh && { fresh }),
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
    "ai_sample",
    {
      description: "Use when measuring HOW OFTEN an AI answer names a business, not just whether it did once. Read-only: it asks the same question `samples` times and reports how often each business appears; nothing is changed or posted anywhere. The runs take one to three minutes, longer than a tool call can wait, so this returns a job_id right away -- call ai_sample_status with it to get the result.\n\nCOLLECTING: ai_sample_status is free and the result does not expire. Typical answers are ready in 30-60 seconds and the slowest in about 130 -- wait 30 seconds before the first check and roughly 15 between checks. status is \"pending\" or \"running\" until then.\n\nWHY SAMPLE: a model composes its answer per request, so one answer is a sample, not a fact -- ask twice ten minutes apart and the businesses and their order can differ. A client asking \"am I showing up in AI answers?\" is asking for a rate, which a single ai_scraper or ai_mode call cannot give.\n\nREPEATS: an identical request within 10 minutes returns the run already in progress (deduplicated: true, 0 credits), so retrying after a dropped connection is safe. To measure the same prompt again on purpose, pass force_new: true. Pass idempotency_key to group requests yourself.\n\nPLATFORMS: chat_gpt and gemini cost 4 credits per sample; google_ai_mode costs 2 credits per sample and requires a location. The mention and visibility tools read stored aggregates, so they are not sampleable -- running one ten times returns the same numbers ten times.\n\nCOST: samples x the per-run price; 10 samples on chat_gpt is 40 credits. Samples that never complete are refunded, and the final figure is credits_charged on the status response.",
      inputSchema: {
        keyword: z.string().min(1).max(500).describe('The prompt or keyword to ask repeatedly (e.g. "best plumber in Orchard Park NY")'),
        platform: z.enum(["chat_gpt", "gemini", "google_ai_mode"]).describe("Which generator to sample. google_ai_mode is Google AI Mode and requires a location."),
        samples: z.number().int().min(2).max(25).describe("How many times to run the prompt, 2-25. Below about 5 the rate is too coarse to act on; 10 is the usual daily figure."),
        location: z.string().max(200).optional().describe('Location (e.g. "Orchard Park, NY"). Required on google_ai_mode. Gemini supports city-level; ChatGPT resolves to country.'),
        force_web_search: z.boolean().optional().describe("Require the platform to search the web before answering. chat_gpt only. Use it when a local prompt comes back as a clarifying question rather than an answer."),
        language: z.string().optional().describe('Language to ask in, as ISO 639-1 code or name (e.g. "fr", "French"). Defaults to the language of the market you pass.'),
        force_new: z.boolean().optional().describe("Run the prompt again even though an identical submit is within the 10-minute replay window. This is how you take a SECOND measurement of the same prompt on purpose; without it the repeat is treated as a retry and returns the first job."),
        idempotency_key: z.string().max(200).optional().describe("Your own key for this submit. Two submits carrying the same key return the same job for 24 hours, whatever their parameters. Use it when you are driving runs from a schedule and want the grouping to be yours rather than ours."),
      },
      outputSchema: sampleSubmitDataSchema,
      annotations: { ...READ_ONLY, title: "AI Answer Sampling" },
    },
    withErrorHandling(async ({ keyword, platform, samples, location, force_web_search, language, force_new, idempotency_key }) => {
      const result = await callApi(
        "/v1/ai/sample",
        {
          keyword,
          platform,
          samples,
          ...(location && { location }),
          ...(force_web_search && { force_web_search }),
          ...(language && { language }),
          ...(force_new && { force_new }),
          ...(idempotency_key && { idempotency_key }),
        },
        getAuth(),
        30_000
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "ai_sample_status",
    {
      description: "Collects the answer to an ai_sample job. FREE — poll as often as you need.\n\nReturns status \"pending\" or \"running\" with progress and total_steps while the samples are still going, \"complete\" with the full distribution once they are done, and \"failed\" with an error if the job died (a failed job is refunded in full). Typical completion is 30-60 seconds, tail around 130.\n\nWHAT COMES BACK: per business — appearances, appearance_rate, shortlist_rate, mean_rank, mean_shortlist_rank, best_rank, worst_rank, top_pick_count and runs_seen — plus every individual run.\n\nTWO DIFFERENT RANKINGS, DO NOT MERGE THEM. `businesses` in a run is the platform's LISTING, in the order it emitted cards. `recommended_businesses` is the SHORTLIST read out of the answer's own prose, in the order the answer argued for it — that is the recommendation, and the two disagree routinely: a business the prose puts third can sit tenth in the listing. Report shortlist_rank when a client asks where an AI recommends them \u2014 it is null for a business the answer named in a sentence rather than listed, and those runs are counted in mention_appearances instead of shortlist_appearances. Each entry's mention quotes what the answer actually said. reader_version says which version of that reader produced the shortlist: it is our reading of the answer, not the platform's own listing, so before comparing this job with an older stored one confirm the versions match -- across a bump the numbers are not comparable and a reader improvement reads as a drop. mean_rank and best_rank are listing positions and are null for a business that was never in a listing.\n\nGEMINI HAS NO LISTING AT ALL. It sends no structured business block, so `businesses` is empty in every gemini run and every gemini figure comes from the prose shortlist. An empty businesses array on gemini is not evidence that nobody was named.\n\nREADING THE RATES: every rate is out of samples_returned, which counts only runs that ANSWERED. A failed run and a refusal are both excluded — a run where the model said \"I'm having a hard time fulfilling your request\" is not a run where the client was absent. Check samples_refused: a high count means the platform is declining the prompt, not that the client is invisible, and per-run `outcome` says which runs those were. An answer that named nobody IS counted, because that is a real absence. mean_rank averages only the runs that named the business, so a business named 2nd in 3 of 10 runs reads mean_rank 2 and appearance_rate 0.3; do not collapse the two into one score.\n\ncited_domains says which SOURCE the answers cited for each business and in how many runs, most-used first -- an answer sourcing a business from its BBB listing rather than its own site is telling you which page it treats as authoritative, and that is usually the finding a client wants. Note that domain and website on the same row hold a citation too, under names that read as the business's own site.\n\nA business the answers spelled more than one way (\"WNY Snow Removal\" and \"WNY Snow Removal LLC\") is reported as ONE row, with every spelling in name_variants -- on gemini there is no cid behind a prose mention, so without that the same business reports two rows at half its real rate each. Only a legal form (LLC, Inc), a bare connector, or a tradeless corporate suffix (Service, Services, Company, Group, Solutions) merges; any word naming a different trade leaves the rows separate, as does a cid. A cited domain separates rows only when it looks like the business's own site -- a directory citation is not evidence of identity. Two rows can still be one business: where one name is the other plus a trade word and both carry the same own-site domain in cited_domains, that is usually one business split across spellings, and its real rate is the two rates added. The split is deliberate -- a chain's branches (\"Smith Dental\" and \"Smith Dental Downtown\") share a domain exactly the same way, and nothing in the answer says which case this is. Merging them is yours to decide with context about the business that we do not have; we leave the seam visible rather than guess, because a wrong merge cannot be undone from the payload.\n\nmatched_on says how runs were tied together: \"cid\" is Google's own identifier and is exact, \"domain\" is domain plus name, \"name\" is the string alone and is the weakest. Google labels AI Mode cards editorially, so on google_ai_mode prefer the cid.\n\nBILLING: this poll costs nothing, so its credit line reads 0. What the job cost is credits_charged — the submit's reservation less the refund for samples that never completed. Refusals are NOT refunded: the prompt was run and the model answered, it just declined.",
      inputSchema: {
        job_id: z.string().min(1).describe("The job_id ai_sample returned."),
      },
      outputSchema: sampleStatusDataSchema,
      annotations: { ...READ_ONLY, title: "AI Answer Sampling Status" },
    },
    withErrorHandling(async ({ job_id }) => {
      const result = await callApiGet(`/v1/ai/sample/status/${encodeURIComponent(job_id)}`, getAuth());
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "ai_match",
    {
      description: "Use when deciding whether a business an AI named IS the business you are tracking. Takes the businesses array from ai_scraper, ai_mode or ai_sample plus a target, and returns matched, confidence, matched_on, rank and the near misses.\n\nWHY NOT DO IT YOURSELF: the two obvious rules both fail quietly. Matching on domain misses roughly a third of appearances, because that is how often ChatGPT names a business with an empty website and domain. Matching on name fails on Google AI Mode, which labels cards editorially — the same business came back as \"The Classic Staple\" in one answer and under its trading name in the next. This matches on cid, then domain, then phone, then name-with-address, then name, and tells you which one it used.\n\nTHE TARGET IS RESOLVED FOR YOU: pass business_name and location and the business is looked up in the local graph first, so a name-only target ends up matching on a cid, a domain and a phone rather than on a string. That lookup is what the 5 credits buy. Pass a cid, domain, website or phone yourself and no lookup is made and it costs 1.\n\nONE ANSWER OR A WHOLE SAMPLE: pass `businesses` for one answer and get a verdict; pass `runs` from an ai_sample result and get appearance_rate, best_rank, worst_rank and mean_rank across the sample, with the verdict for each run. Pass one or the other, never both.\n\nREADING confidence: 1.0 is a cid, 0.9 a domain or phone, 0.8 a name with a matching address, 0.65 a name alone. matched is true exactly when confidence is 0.5 or above, so a name-only tie between two candidates comes back matched: false — one of them is the client, but nothing in the answer says which. Filter on matched_on when you need identifier-grade certainty.\n\nWHAT IS NOT A SIGNAL: a website on a shared host (Facebook, Instagram, Linktree, business.site, the big directories) is not a domain match. A name matches only when the shorter of the two is wholly contained in the longer, and a one-word name never matches alone. Two addresses agree only when the street number, street line and town all agree. target.place_id needs target.location beside it.\n\nIDENTIFIER COVERAGE — READ THIS BEFORE QUOTING A LOW RATE: identifier_coverage says how much of the answer could be identified AT ALL. `identified` counts the businesses carrying a cid, a domain or a phone, out of `candidates`. Two of six means four rows could only ever be matched by name, and a name-only miss is not the same fact as an absence — say so rather than reporting the rate alone. Coverage is a property of what the platform published, not of the client.\n\nWHERE THE CID GOES: pass a cid inside `target`, where it makes the match exact and skips the lookup. Never filter the businesses you pass in on whether they carry one — the rows without a cid are most of the answer, and dropping them removes the appearances you are trying to count.\n\nSOURCE PROVENANCE, NOT A WARNING: source_graph says which platform's record the AI repeated — google, bing, yelp, aggregator, or unknown. A cid means Google; a Yelp URL means Yelp; a business's own domain means unknown, because it says the AI has the business and not where it read it. entity_variants lists the spellings of the matched business across the runs, each with its source_graph. Two or three variants is the NORMAL state of a business that exists on more than one platform — do not report it as a problem, report it as provenance. It is what lets you say: your Google profile is fine, ChatGPT is reading Bing, and Bing has you in the wrong town.\n\nWHAT IS A PROBLEM: nap_conflicts, and only that. It carries a value that genuinely contradicts the client\'s own record — a phone number that is not theirs, an address in the wrong town — with the source_graph that supplied it, so the fix has an address. An empty nap_conflicts beside three entity_variants means the client is listed in three places and all three are right.",
      inputSchema: {
        target: z.object({
          business_name: z.string().min(1).describe("The business being tracked"),
          location: z.string().optional().describe('City and state (e.g. "Buffalo, NY"). With this, the business is looked up and matched on its real identifiers.'),
          cid: z.string().optional().describe("Google CID in decimal, if you hold one. Strongest possible signal; skips the lookup."),
          place_id: z.string().optional().describe("Google place_id, used to resolve the business exactly rather than by name."),
          domain: z.string().optional().describe("The business's domain. Skips the lookup."),
          website: z.string().optional().describe("The business's website URL. Skips the lookup."),
          phone: z.string().optional().describe("The business's phone number, in any format. Skips the lookup."),
          address: z.string().optional().describe("Street address, used to strengthen a name match."),
        }).describe("The business to look for"),
        businesses: z.array(z.record(z.string(), z.unknown())).optional().describe("One answer's businesses, exactly as ai_scraper, ai_mode or a single ai_sample run returns them. Extra fields are ignored, so pass the array through untouched."),
        runs: z.array(z.record(z.string(), z.unknown())).optional().describe("The runs array from an ai_sample result, to get a rate across the whole sample instead of one verdict."),
        resolve: z.boolean().optional().describe("Force the profile lookup on (true) or off (false). Default: on when there is a location and no identifier was supplied."),
      },
      // A `runs` request answers in the matchRuns shape, which shares none of
      // the single-answer fields. Declaring only the single-answer schema made
      // the SDK reject every runs response as invalid output AFTER the call
      // had been made and the credits spent — the agent got an error and paid
      // for the answer it did not get.
      outputSchema: matchAnyDataSchema,
      annotations: { ...READ_ONLY, title: "AI Answer Entity Match" },
    },
    withErrorHandling(async ({ target, businesses, runs, resolve }) => {
      const result = await callApi(
        "/v1/ai/match",
        {
          target,
          ...(businesses && { businesses }),
          ...(runs && { runs }),
          ...(resolve !== undefined && { resolve }),
        },
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );
}
