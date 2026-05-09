# Local SEO Data MCP Server

[Model Context Protocol](https://modelcontextprotocol.io) server for [Local SEO Data](https://localseodata.com). Gives AI assistants access to 42 local SEO tools -- SERP tracking, review monitoring, keyword research, AI visibility scoring, geogrid scans, and more.

One-time setup, then ask questions in plain English and your assistant calls the right endpoints automatically.

## Prerequisites

1. Sign up at [localseodata.com/signup](https://localseodata.com/signup)
2. Create an API key in your [API Keys dashboard](https://localseodata.com/dashboard/keys)
3. Replace `YOUR_API_KEY` below with your key (starts with `sk_live_`)

## Setup

### Claude Code

```bash
claude mcp add localseodata --transport http "https://mcp.localseodata.com/mcp?key=YOUR_API_KEY" --scope user
```

The `--scope user` flag makes it available across all your projects. Restart Claude Code after adding.

### Claude Desktop

Add to your config file:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "localseodata": {
      "url": "https://mcp.localseodata.com/mcp?key=YOUR_API_KEY"
    }
  }
}
```

Restart Claude Desktop after saving.

### Cursor

Add to `.cursor/mcp.json` in your project root, or `~/.cursor/mcp.json` for global access:

```json
{
  "mcpServers": {
    "localseodata": {
      "url": "https://mcp.localseodata.com/mcp?key=YOUR_API_KEY"
    }
  }
}
```

### VS Code (GitHub Copilot)

Add to `.vscode/mcp.json` in your project:

```json
{
  "servers": {
    "localseodata": {
      "type": "streamable-http",
      "url": "https://mcp.localseodata.com/mcp?key=YOUR_API_KEY"
    }
  }
}
```

### Cline

Open Cline settings > MCP Servers > Add Remote Server:
- **Name:** localseodata
- **URL:** `https://mcp.localseodata.com/mcp?key=YOUR_API_KEY`

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "localseodata": {
      "serverUrl": "https://mcp.localseodata.com/mcp?key=YOUR_API_KEY"
    }
  }
}
```

## Available Tools

| Category | Tools |
|----------|-------|
| SERP Data | `local_pack`, `organic_serp`, `local_finder`, `maps`, `local_services_ads` |
| AI/LLM Optimization | `ai_overview`, `ai_mode`, `ai_mentions`, `ai_visibility`, `ai_compare`, `ai_keyword_data`, `ai_top_sources`, `ai_top_pages` |
| Business Data | `business_profile`, `google_reviews`, `qa`, `business_listings`, `multi_platform_reviews` |
| Keyword Research | `search_volume`, `keyword_suggestions`, `keywords_for_site`, `related_keywords`, `keyword_trends` |
| Audits | `local_audit`, `citation_audit`, `reputation_audit`, `page_audit`, `profile_health` |
| Competitive Intel | `competitor_gap`, `competitor_ads`, `brand_mentions`, `backlink_gap`, `backlink_summary` |
| Reports | `review_velocity`, `local_authority`, `keyword_opportunities` |
| Geogrid | `geogrid_scan` |
| Locations | `location_search` |
| Utility | `ping`, `get_balance` |

## Example Prompts

Once connected, just ask naturally:

- "Who ranks in the local pack for 'plumber' in Denver?"
- "Run a full local SEO audit for Mike's Plumbing in Austin, TX"
- "Compare my Google reviews to my top 3 competitors"
- "What keywords should a dentist in Portland be targeting?"
- "Check if my business NAP is consistent across directories"
- "Map my rankings on a 5x5 geogrid for 'bakery' in Brooklyn"
- "What's my AI visibility score for 'best pizza in Chicago'?"

## Authentication

Your API key is passed as a URL query parameter (`?key=YOUR_API_KEY`). This works with every MCP client without needing custom header configuration. Keys can be created or revoked anytime in the [API Keys dashboard](https://localseodata.com/dashboard/keys).

## Pricing

MCP calls consume credits from your Local SEO Data account, same as REST API calls. Most endpoints cost 1 credit ($0.005). Monitor usage in your [dashboard](https://localseodata.com/dashboard).

See [localseodata.com/pricing](https://localseodata.com/pricing) for plans.

## Self-Hosting

If you want to run the MCP server yourself:

```bash
git clone https://github.com/localseodata/mcp-server.git
cd mcp-server
npm install
npm run build
```

Set the required environment variable and start:

```bash
export API_BASE_URL=https://api.localseodata.com
npm start
```

The server runs on port 3003 by default (set `PORT` to change). A Dockerfile is included for container deployments.

## Development

```bash
npm run dev       # Watch mode with hot reload
npm run build     # Compile TypeScript
npm run typecheck # Type check without emitting
npm start         # Run compiled output
```

## License

MIT
