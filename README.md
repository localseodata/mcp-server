# Local SEO Data MCP Server

[Model Context Protocol](https://modelcontextprotocol.io) server for [Local SEO Data](https://localseodata.com). It gives AI assistants 53 local SEO data tools: SERP and map rankings, reviews, audits, keyword research, competitor analysis, geogrid tracking, and AI visibility scoring.

Connect once, then ask questions in plain English. Your assistant picks the right tools.

- **Endpoint:** `https://mcp.localseodata.com/mcp` (streamable HTTP)
- **Docs:** [localseodata.com/docs/mcp-server](https://localseodata.com/docs/mcp-server)
- **Privacy policy:** [localseodata.com/privacy](https://localseodata.com/privacy)

## Setup (OAuth, recommended)

Add `https://mcp.localseodata.com/mcp` as a connector in your client and click **Connect**. You'll be asked to sign in to Local SEO Data (or create an account) and approve access. You don't need to copy an API key.

### Claude (claude.ai, Claude Desktop, mobile)

1. Open **Settings → Connectors → Add custom connector**.
2. Enter a name (e.g. `Local SEO Data`) and the URL `https://mcp.localseodata.com/mcp`.
3. Click **Add**, then **Connect**, and sign in.

### Claude Code

```bash
claude mcp add localseodata --transport http https://mcp.localseodata.com/mcp --scope user
```

Then run `/mcp` in Claude Code, select `localseodata`, and choose **Authenticate**.

### ChatGPT and other OAuth-capable clients

Add a custom connector or remote MCP server with the URL `https://mcp.localseodata.com/mcp` and click **Connect**. Any client that supports MCP authorization will start the sign-in flow on its own.

## Fallback: API key in the URL

If your client can't do OAuth, pass an API key in the URL instead:

1. Sign up at [localseodata.com/signup](https://localseodata.com/signup).
2. Create a key in your [API Keys dashboard](https://localseodata.com/dashboard/keys). Keys start with `sk_live_`.
3. Use `https://mcp.localseodata.com/mcp?key=YOUR_API_KEY` as the server URL.

Example configs:

**Cursor** (`.cursor/mcp.json` or `~/.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "localseodata": {
      "url": "https://mcp.localseodata.com/mcp?key=YOUR_API_KEY"
    }
  }
}
```

**VS Code (GitHub Copilot)** (`.vscode/mcp.json`)

```json
{
  "servers": {
    "localseodata": {
      "type": "http",
      "url": "https://mcp.localseodata.com/mcp?key=YOUR_API_KEY"
    }
  }
}
```

**Windsurf** (`~/.codeium/windsurf/mcp_config.json`)

```json
{
  "mcpServers": {
    "localseodata": {
      "serverUrl": "https://mcp.localseodata.com/mcp?key=YOUR_API_KEY"
    }
  }
}
```

**Cline**: Settings → MCP Servers → Add Remote Server, with the URL `https://mcp.localseodata.com/mcp?key=YOUR_API_KEY`.

You can create or revoke keys at any time in the [API Keys dashboard](https://localseodata.com/dashboard/keys). Treat a URL that contains your key like a password.

## Available tools

53 tools in total:

| Category | Tools |
|----------|-------|
| SERP data | `local_pack`, `organic_serp`, `maps`, `local_finder`, `local_services_ads`, `ai_overview`, `ai_mode` |
| Other platforms | `apple_maps`, `apple_business_profile`, `bing_local`, `bing_business_profile` |
| AI visibility | `ai_mentions`, `ai_visibility`, `ai_compare`, `ai_top_sources`, `ai_top_pages`, `ai_keyword_data`, `ai_llm_response`, `ai_scraper`, `ai_sample`, `ai_sample_status`, `ai_match` |
| Business data | `business_profile`, `profile_health`, `qa`, `business_listings`, `google_reviews`, `review_velocity`, `multi_platform_reviews` |
| Keyword research | `search_volume`, `keyword_overview`, `keyword_suggestions`, `related_keywords`, `keywords_for_site`, `keyword_trends` |
| Audits | `local_audit`, `citation_audit`, `reputation_audit`, `page_audit` |
| Competitive intel | `competitor_ads`, `brand_mentions`, `backlink_summary`, `backlink_gap` |
| Reports | `competitor_gap`, `local_authority`, `keyword_opportunities` |
| Geogrid | `geogrid_scan`, `geogrid_status` |
| Locations | `location_search` |
| Account / utility | `get_balance`, `history_search`, `history_get`, `ping` |

AI visibility tools report on ChatGPT, Gemini, Perplexity, Claude and Google's AI Overviews and AI Mode. Each tool's description lists its credit cost, and the server sends your assistant instructions on which tool fits which question.

## Example prompts

- "Who ranks in the local pack for 'plumber' in Denver?"
- "Run a full local SEO audit for Mike's Plumbing in Austin, TX"
- "Compare my Google reviews to my top 3 competitors"
- "Am I listed correctly on Apple Maps and Bing?"
- "What keywords should a dentist in Portland be targeting?"
- "Map my rankings on a 5x5 geogrid for 'bakery' in Brooklyn"
- "How often does ChatGPT recommend my business for 'best pizza in Chicago'?"

## Pricing

MCP calls use credits from your Local SEO Data account, the same as REST API calls. `get_balance`, `location_search`, `ping`, `geogrid_status`, `ai_sample_status`, `history_search` and `history_get` are free. See [localseodata.com/pricing](https://localseodata.com/pricing) for plans, and check usage in your [dashboard](https://localseodata.com/dashboard).

## Running it yourself

### HTTP server

```bash
git clone https://github.com/localseodata/mcp-server.git
cd mcp-server
npm ci
npm run build
npm start
```

The server listens on port 3003 by default (`PORT` changes it) and serves MCP at `/mcp`, with a health check at `/health`. Clients authenticate with `?key=YOUR_API_KEY` or an `Authorization: Bearer` header. A Dockerfile is included.

Optional environment variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `API_BASE_URL` | `https://api.localseodata.com` | Local SEO Data API the tools call |
| `PORT` | `3003` | HTTP port |
| `OAUTH_ENABLED` | `false` | Advertise OAuth and accept OAuth access tokens |
| `OAUTH_ISSUER` | `https://localseodata.com` | Authorization server |
| `MCP_RESOURCE_URL` | `https://mcp.localseodata.com/mcp` | This server's public URL, used in OAuth metadata |

OAuth access tokens are only accepted by the API from the hosted server, so a self-hosted copy should use API keys.

### stdio

For clients that launch a local process:

```bash
npm ci && npm run build
LOCALSEODATA_API_KEY=sk_live_... node dist/stdio.js
```

## Development

```bash
npm run dev        # Watch mode
npm run typecheck  # Type check
npm test           # Run tests
npm run build      # Compile to dist/
```

## License

MIT
