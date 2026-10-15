export const AGENT_INSTRUCTIONS = `Local SEO Data — 53 local SEO data tools. Rankings, reviews, audits, keyword research, competitor analysis, geogrid tracking, and AI visibility scoring.

## First Steps

1. get_balance (free) reports available credits — a useful check before starting expensive or multi-step work.
2. location_search (free) resolves city names when the format is unclear. Most tools accept natural locations like "Buffalo, NY"; location_search guarantees the exact format.

## Tool Selection

### Checking rankings?
- Just the local 3-pack? → local_pack (2 cr)
- Full SERP with ads, PAA, AI overview? → organic_serp (2 cr)
- More than 3 local results with GPS? → maps (2 cr)
- Extended local results (20+)? → local_finder (2 cr)
- Google's AI Overview snippet? → ai_overview (2 cr)
- Full AI Mode response? → ai_mode (2 cr)
- Google Guaranteed/Screened ads? → local_services_ads (2 cr)
- Geographic rank heatmap? → geogrid_scan (2 cr per point: 50 cr for the default 5x5, 18-162 cr by grid_size; async, waits for the grid). If it hands back a job_id instead, collect it with geogrid_status (free) rather than scanning again.

### Analyzing a business?
- Full GBP data (NAP, hours, categories)? → business_profile (5 cr)
- What's missing from the GBP? → profile_health (5 cr)
- Read review text and replies? → google_reviews (1 cr per 10)
- Review growth and sentiment trends? → review_velocity (6 cr)
- Ratings across Google + Trustpilot? → multi_platform_reviews (6 cr)
- Q&A on the listing? → qa (5 cr)
- All businesses in a category/area? → business_listings (10 cr per 50)

### Keyword research?
- Have keywords, need volume/CPC? → search_volume (72 cr flat, any number of keywords)
- Have keywords, need volume + difficulty + intent? → keyword_overview (10-116 cr by keyword count, country-level only)
- Need keyword ideas from a seed? → keyword_suggestions (92 cr)
- Semantically related keywords? → related_keywords (72 cr)
- What does a competitor rank for? → keywords_for_site (20 cr)
- Trending up or down? → keyword_trends (9 cr)
- Best local keywords to target? → keyword_opportunities (4 cr)

### AI visibility?
Supports 4 LLMs: ChatGPT, Claude, Gemini, Perplexity. Mention/visibility tools measure brand presence across chat_gpt + google platforms. LLM response tools query specific models directly.
- Is my brand mentioned in AI outputs? → ai_mentions (81-160 cr, scales with limit; platforms: chat_gpt, google)
- My domain's overall AI score? → ai_visibility (81 cr, platforms: chat_gpt, google)
- Compare domains side by side? → ai_compare (81 cr per domain, platforms: chat_gpt, google)
- What does a specific LLM say? → ai_llm_response (8 cr standard / 20 premium / 40 frontier model, platforms: chat_gpt, claude, gemini, perplexity)
- Budget AI result scrape? → ai_scraper (4 cr, platforms: chat_gpt, gemini)
- How OFTEN does an AI name a business? → ai_sample to submit, then ai_sample_status to collect (samples x 4 cr on chat_gpt/gemini, x 2 on google_ai_mode; the status poll is free)
- Is the business an AI named the one being tracked? → ai_match (5 cr with the target lookup, 1 cr without)
- Already asked this before? → history_search then history_get (both free)
- AI search volume for keywords? → ai_keyword_data (9-16 cr, scales with keyword count)
- Which domains do AIs cite most? → ai_top_sources (81 cr, platforms: chat_gpt, google)
- Which pages do AIs cite most? → ai_top_pages (81 cr, platforms: chat_gpt, google)

### Competitor & backlink analysis?
- Side-by-side competitor comparison? → competitor_gap (10 cr + 2/competitor, default 20)
- Competitor's Google Ads keywords? → competitor_ads (2 cr)
- Backlink profile summary? → backlink_summary (23 cr)
- Compare backlink profiles? → backlink_gap (23 cr)
- Brand mentions across the web? → brand_mentions (23 cr)

### Site & page analysis?
- Quick on-page audit of a URL? → page_audit (1 cr)

### Comprehensive audits? (expensive, confirm with user first)
- Full local SEO audit → local_audit (50 cr, async)
- Citation/NAP consistency → citation_audit (125 cr for all 50 directories; pass directories=20 for 50 cr)
- Reputation score → reputation_audit (30 cr)
- Composite authority score → local_authority (10 cr)

## Credit Management

- get_balance is worth checking before multi-step analyses.
- Prefer cheaper tools when they answer the question: local_pack (2 cr) over local_audit (50 cr) when a full audit isn't needed.
- For multi-step work, estimate total cost upfront and warn the user if it exceeds 50% of their balance.
- Composite tools (local_audit, citation_audit, geogrid_scan) are premium — confirm with the user before calling them.
- Every tool response includes credits_used and credits_remaining — monitor these as you work.
- If a tool returns an insufficient_credits error, tell the user their balance and the cost required.

## Common Workflows

Business audit: business_profile → google_reviews → profile_health (11 cr total)
Competitor analysis: competitor_gap → business_listings → backlink_gap (53 cr total)
Keyword research: keyword_suggestions → search_volume → keyword_trends (173 cr total)
AI visibility check: ai_visibility → ai_mentions → ai_top_sources (250 cr total)
Reputation monitor: multi_platform_reviews → review_velocity → brand_mentions (35 cr total)
Full deep audit: local_audit → citation_audit → geogrid_scan (150-337 cr — confirm first)

## Data Notes

All ranking and SERP data (local_pack, organic_serp, maps, local_finder, ai_overview, ai_mode, geogrid_scan) uses non-personalized Google search. Results will differ from what a user sees in their browser because Google personalizes by location history, search history, logged-in account, and device. This is standard for SEO tools but users may notice discrepancies if they compare against their own searches. When presenting results, mention that data reflects non-personalized rankings.

Review counts and ratings may lag Google's live display by a few hours. AI visibility results (ai_mentions, ai_llm_response, ai_scraper) are point-in-time snapshots -- LLM outputs change frequently.

Responses are cached for an hour, which is right for rankings and wrong for AI answers -- the model composes one per request, so asking twice ten minutes apart can name different businesses. ai_overview, ai_mode, ai_llm_response and ai_scraper therefore take fresh: true, which skips the cached answer and runs the query again. Use it when you are sampling the same prompt to see how the answer varies; without it every run after the first returns the first run's answer and the variance reads as zero. A fresh call costs the normal price and takes the full duration -- do not set it on a one-off lookup, and do not loop it. The other AI tools (ai_mentions, ai_top_sources, ai_top_pages, ai_visibility, ai_compare, ai_keyword_data) read stored aggregates and do not take it.

search_volume returns city/state-scoped volumes when local data exists (volume_scope: "local") and falls back to country-level numbers otherwise (volume_scope: "country"). Always check volume_scope and location_used before presenting numbers as local. A null search_volume means we have no data for that keyword — it does not mean zero searches. If location_alternatives is present, the requested place has sibling entities (e.g. "Hamilton" vs "Hamilton Township") whose volumes can differ 3-5x — check both before presenting either as the market size.

Low-volume metric reliability: below ~500 searches/month, Google Ads CPC and competition_level decouple from reality (tiny sample), and monthly_searches snaps to fixed rungs (e.g. 30/50/70/110) — one rung of movement is noise, not a trend. When reporting on low-volume keywords, present the volume only; do not narrate CPC, competition, or month-over-month "surges" from rung changes.

## Important Notes

- Every response this API returns is stored. Before buying data to answer "has this changed?", "what did we see last time?" or "did we already check this?", search history_search and read the stored answer with history_get. Both are free; re-running the original endpoint charges full price for a second copy of something already paid for. A month of daily AI Mode calls becomes 30 free reads instead of 30 paid ones.

- Async tools (local_audit, geogrid_scan) take 15-60 seconds. The tool will poll until results are ready.
- review_velocity and multi_platform_reviews take 10-30 seconds. This is normal, not an error.
- The AI tools are slow because the model answers each request: ai_scraper 30-90 seconds, ai_llm_response 15-60, ai_mode and ai_overview 10-30. Do not retry one still in flight — that starts a second billable job. ai_sample is the exception: it submits in about a second and the waiting happens in ai_sample_status, which is free.
- Sandbox keys (sk_test_*) return realistic mock data and charge zero credits. Useful for testing.
- The ai_scraper tool (4 cr) is a budget alternative to ai_llm_response (8-40 cr) when you just need the AI's answer text.
- A question about frequency or consistency ("am I showing up in ChatGPT?", "is my competitor named more often?") is a question about a RATE, and one ai_scraper or ai_mode call cannot answer it. Use ai_sample: it runs the prompt 2-25 times and returns appearance_rate, mean_rank and every run. ai_sample submits and returns a job_id in about a second; collect the answer with ai_sample_status, which is free — wait 30 seconds before the first poll. Do not resubmit while a job is in flight; an identical submit inside 10 minutes returns the running job rather than billing a second one, and force_new: true is how you ask for a genuine second measurement. Read appearance_rate out of samples_returned, and do not merge it with mean_rank -- named 2nd in 3 of 10 runs is mean_rank 2 and appearance_rate 0.3, which are different problems.
- In a sample, the businesses array is the platform LISTING and recommended_businesses is the SHORTLIST read out of the answer prose. They disagree routinely, and the shortlist is the recommendation -- quote shortlist_rank and shortlist_rate when a client asks where an AI recommends them. An answer recommends in two ways and only one of them has a position: listed: true entries are places in a list the answer presented and carry a shortlist_rank, while a business named in a sentence comes back listed: false with shortlist_rank null and is counted in mention_appearances, not shortlist_appearances -- it was recommended, it just never held a rank. Every entry carries mention, the answer's own words about it, which is the evidence to quote to a client. recommended_businesses is OUR reading of the answer text, not the platform's own listing, and reader_version says which reader produced it -- when comparing a job against an older stored one, check that the versions match before calling a difference a change in visibility. Gemini sends no listing at all, so on gemini every figure comes from the prose and an empty businesses array means nothing.
- samples_returned counts only runs that ANSWERED. A refusal ("I am having a hard time fulfilling your request") is excluded and counted in samples_refused instead, because a model declining is not the client being absent. A high samples_refused is a finding about the platform, not about the client. An answer that named nobody IS counted -- that one is a real absence.
- Do not decide whether an AI named a business by comparing names or domains yourself. ChatGPT names a business with no website about a third of the time, and Google AI Mode labels cards editorially -- the same business appears as "The Classic Staple" in one answer and under its trading name in the next. Pass the businesses array to ai_match with the target's name and location; it resolves the business first and tells you which signal matched.
- location_search is free and resolves ambiguous city names. Use it when a tool returns no results for a location.
- For multi-location brands, get the store's place_id from business_profile first and pass it to google_reviews / review_velocity / multi_platform_reviews — name+location lookups can silently return empty for chains.
- If tools are failing with auth errors, use ping (free) to diagnose connectivity and API key issues.`;
