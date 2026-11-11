# Local SEO Data plugin for Grok Build

Connects Grok Build to [Local SEO Data](https://localseodata.com), the local SEO data
API, through its hosted MCP server. Ask in plain English and Grok picks the tool:

- Google local pack, Maps, Local Finder and organic rankings for a keyword and city
- Google Business Profiles, reviews, review velocity and Q&A
- Local SEO, citation (NAP) and reputation audits
- Local keyword research and search volume
- Competitor, Google Ads and backlink comparisons
- Geogrid rank scans across a service area
- Brand visibility in AI answers (ChatGPT, Gemini, Perplexity, Claude, Google AI Mode)
- Apple Maps and Bing listings

## What it contains

| File | Purpose |
|---|---|
| `.mcp.json` | The hosted MCP server, `https://mcp.localseodata.com/mcp` (streamable HTTP) |
| `skills/local-seo-data/SKILL.md` | When to use the server and how to spend credits carefully |
| `.grok-plugin/plugin.json` | Plugin manifest |
| `assets/logo.png` | Logo |

No hooks, commands, scripts or local code. The plugin runs nothing on your machine.

## Sign-in and credentials

On first connect you sign in to your Local SEO Data account (or create one) and
approve access over OAuth. No API key is stored in the plugin. Each tool call uses
credits from that account; `get_balance` is free.

## Network endpoints

- `mcp.localseodata.com`: the MCP server. It is the only host the plugin contacts.
- `localseodata.com`: the OAuth sign-in page, opened in your browser.

## Data and privacy

Every tool is read-only. Local SEO Data looks up public search and listing data and
never changes your Google Business Profile or any other account. Privacy policy:
[localseodata.com/privacy](https://localseodata.com/privacy). Docs:
[localseodata.com/docs/mcp-server](https://localseodata.com/docs/mcp-server).

## License

MIT. See [LICENSE](LICENSE).
