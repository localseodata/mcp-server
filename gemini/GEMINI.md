---
name: local-seo-data
description: >-
  Pull live local search data through the Local SEO Data MCP server: Google local
  pack, Maps, Local Finder and organic rankings, Google Business Profiles, reviews
  and Q&A, local SEO, citation and reputation audits, local keyword research,
  geogrid rank scans, competitor and backlink comparisons, Apple Maps and Bing
  listings, and brand visibility in AI answers. Use whenever "Local SEO Data",
  "localseodata", or a localseodata.com link comes up, or the user asks for any of
  that data for a business, keyword or city.
---

# Local SEO Data

The `localseodata` MCP server bundled with this plugin looks up public local search
data for any business and market. It acts as the signed-in Local SEO Data account
and charges that account's credits per call. The server sends its own tool-selection
guide when it connects; follow it. The rules below are the ones that matter most.

## Before you act

1. **Check the balance first on multi-step work.** `get_balance` is free. Estimate
   the total cost before a chain of calls and warn the user if it is more than half
   their balance.
2. **Resolve the location when it is ambiguous.** Most tools take a natural location
   such as `Austin, TX`. If a tool returns nothing for a place, call
   `location_search` (free) and retry with the exact format it returns.
3. **Reuse what was already bought.** Before re-running a lookup to see whether
   something changed, search `history_search` and read the stored answer with
   `history_get`. Both are free.
4. **Confirm before expensive tools.** `local_audit`, `citation_audit` and
   `geogrid_scan` cost 50 credits or more. Say the cost and get a yes first.
5. **Pick the cheapest tool that answers.** `local_pack` (2 credits) answers "who
   ranks for X in Y"; a full `local_audit` is not needed for that.

## Reading results

- Rankings are non-personalized. They can differ from what the user sees in their
  own browser, so say so when you present them.
- A question about how *often* an AI names a business is a question about a rate.
  Use `ai_sample` and collect it with `ai_sample_status` (free) instead of a single
  `ai_mode` or `ai_scraper` call.
- Do not decide by string comparison whether an AI answer named a business. Pass
  the answer's businesses to `ai_match` with the target's name and location.
- For chains, get the store's `place_id` from `business_profile` first and pass it
  to the review tools.

## Scope

Every tool is read-only. Local SEO Data cannot reply to reviews, edit a Business
Profile or change any account. It returns public business data only, never
personal information about reviewers or other private individuals.
