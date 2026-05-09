import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callApi, formatResult, withErrorHandling } from "../api-client.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

export function registerAIVisibilityTools(server: McpServer, getAuth: () => string) {
  server.tool(
    "ai_mentions",
    "Find where a keyword appears in AI model outputs (ChatGPT, Google AI). Returns mention context and sources. Costs 5 credits.",
    {
      keyword: z.string().min(1).describe('Keyword to search for (e.g. "best plumber in Buffalo")'),
      location: z.string().optional().describe('Location for results (e.g. "Portland, OR"). Default: US'),
      platforms: z.array(z.enum(["chat_gpt", "google"])).optional().describe("Platforms to query. Default: all"),
      limit: z.number().int().min(1).max(100).optional().describe("Max mentions. Default: 10, max: 100"),
    },
    READ_ONLY,
    withErrorHandling(async ({ keyword, location, platforms, limit }) => {
      const result = await callApi(
        "/v1/ai/mentions",
        { keyword, ...(location && { location }), ...(platforms && { platforms }), ...(limit && { limit }) },
        getAuth()
      );
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );

  server.tool(
    "ai_top_sources",
    "Get the top domains cited in AI model responses for a keyword. Shows which sites AI models reference most. Costs 5 credits.",
    {
      keyword: z.string().min(1).describe('Keyword to search for (e.g. "plumber near me")'),
      location: z.string().optional().describe('Location for results (e.g. "Seattle, WA"). Default: US'),
      platforms: z.array(z.enum(["chat_gpt", "google"])).optional().describe("Platforms to query. Default: all"),
      limit: z.number().int().min(1).max(20).optional().describe("Max domains. Default: 10, max: 20"),
    },
    READ_ONLY,
    withErrorHandling(async ({ keyword, location, platforms, limit }) => {
      const result = await callApi(
        "/v1/ai/top-sources",
        { keyword, ...(location && { location }), ...(platforms && { platforms }), ...(limit && { limit }) },
        getAuth()
      );
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );

  server.tool(
    "ai_top_pages",
    "Get the top pages (not just domains) cited by AI models for a keyword. More granular than top_sources. Costs 5 credits.",
    {
      keyword: z.string().min(1).describe('Keyword to search for (e.g. "best dentist")'),
      location: z.string().optional().describe('Location for results (e.g. "Chicago, IL"). Default: US'),
      platforms: z.array(z.enum(["chat_gpt", "google"])).optional().describe("Platforms to query. Default: all"),
      limit: z.number().int().min(1).max(50).optional().describe("Max pages. Default: 10, max: 50"),
    },
    READ_ONLY,
    withErrorHandling(async ({ keyword, location, platforms, limit }) => {
      const result = await callApi(
        "/v1/ai/top-pages",
        { keyword, ...(location && { location }), ...(platforms && { platforms }), ...(limit && { limit }) },
        getAuth()
      );
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );

  server.tool(
    "ai_visibility",
    "Measure a domain's visibility across AI platforms for up to 10 keywords. Shows how often and where AI models cite your site. Costs 10 credits.",
    {
      domain: z.string().min(1).describe('Domain to analyze (e.g. "example.com")'),
      keywords: z.array(z.string().min(1)).min(1).max(10).describe("Keywords to check visibility for"),
      location: z.string().optional().describe('Location for results (e.g. "Austin, TX"). Default: US'),
      platforms: z.array(z.enum(["chat_gpt", "google"])).optional().describe("Platforms to query. Default: all"),
    },
    READ_ONLY,
    withErrorHandling(async ({ domain, keywords, location, platforms }) => {
      const result = await callApi(
        "/v1/ai/visibility",
        { domain, keywords, ...(location && { location }), ...(platforms && { platforms }) },
        getAuth()
      );
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );

  server.tool(
    "ai_compare",
    "Compare multiple domains' AI visibility side by side. See which competitor gets more AI mentions. Costs 10 credits.",
    {
      domains: z.array(z.string().min(1)).min(2).max(5).describe('Domains to compare (e.g. ["yoursite.com", "competitor.com"])'),
      keywords: z.array(z.string().min(1)).min(1).max(10).describe("Keywords to compare across"),
      location: z.string().optional().describe('Location for results (e.g. "Denver, CO"). Default: US'),
    },
    READ_ONLY,
    withErrorHandling(async ({ domains, keywords, location }) => {
      const result = await callApi(
        "/v1/ai/compare",
        { domains, keywords, ...(location && { location }) },
        getAuth()
      );
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );

  server.tool(
    "ai_keyword_data",
    "Get AI search volume and trends for keywords — how often they're searched in ChatGPT and other LLMs. Costs 1 credit per 50 keywords.",
    {
      keywords: z.array(z.string().min(1)).min(1).max(100).describe('Keywords to get AI volume for (e.g. ["plumber near me", "emergency plumber"])'),
      location: z.string().optional().describe('Location for results (e.g. "Miami, FL"). Default: US'),
    },
    READ_ONLY,
    withErrorHandling(async ({ keywords, location }) => {
      const result = await callApi(
        "/v1/ai/keyword-data",
        { keywords, ...(location && { location }) },
        getAuth()
      );
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );

  server.tool(
    "ai_llm_response",
    "Query a specific LLM (ChatGPT, Claude, Gemini, Perplexity) and get its structured response. See what each AI says about a topic. Costs 8 credits.",
    {
      prompt: z.string().min(1).max(500).describe('Prompt to send to the LLM (e.g. "What is the best plumber in Portland?"). Max 500 characters.'),
      platform: z.enum(["chat_gpt", "claude", "gemini", "perplexity"]).describe("Which LLM to query"),
      model: z.string().max(100).optional().describe("Optional model name (e.g. gpt-4o, claude-sonnet-4-20250514, gemini-2.5-flash, sonar). Defaults to latest for each platform."),
    },
    READ_ONLY,
    withErrorHandling(async ({ prompt, platform, model }) => {
      const result = await callApi(
        "/v1/ai/llm-response",
        { prompt, platform, model },
        getAuth()
      );
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );

  server.tool(
    "ai_scraper",
    "Scrape ChatGPT or Gemini search results for a keyword. Budget-friendly alternative to llm_response. Costs 3 credits.",
    {
      keyword: z.string().min(1).describe('Keyword to scrape results for (e.g. "best electrician")'),
      platform: z.enum(["chat_gpt", "gemini"]).describe("Which platform to scrape (chat_gpt or gemini)"),
      location: z.string().optional().describe('Location for results (e.g. "Boston, MA"). Default: US'),
    },
    READ_ONLY,
    withErrorHandling(async ({ keyword, platform, location }) => {
      const result = await callApi(
        "/v1/ai/scraper",
        { keyword, platform, ...(location && { location }) },
        getAuth()
      );
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );
}
