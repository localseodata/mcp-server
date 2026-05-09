import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSerpTools } from "./tools/serp.js";
import { registerBusinessTools } from "./tools/business.js";
import { registerReviewTools } from "./tools/reviews.js";
import { registerAuditTools } from "./tools/audit.js";
import { registerGeogridTools } from "./tools/geogrid.js";
import { registerReportTools } from "./tools/report.js";
import { registerIntelligenceTools } from "./tools/intelligence.js";
import { registerDiagnosticTools } from "./tools/diagnostics.js";
import { registerKeywordTools } from "./tools/keywords.js";
import { registerBacklinkTools } from "./tools/backlinks.js";
import { registerSiteTools } from "./tools/site.js";
import { registerAIVisibilityTools } from "./tools/ai-visibility.js";
import { registerCompetitiveTools } from "./tools/competitive.js";
import { registerLocationTools } from "./tools/locations.js";
import { registerAccountTools } from "./tools/account.js";

export function createMcpServer(getAuth: () => string): McpServer {
  const server = new McpServer({
    name: "localseodata",
    version: "1.0.0",
    description: `LocalSEOData — Local SEO intelligence API.

IMPORTANT — Credit budget awareness:
1. ALWAYS call get_balance FIRST before starting any analysis. This is free (0 credits).
2. Plan your tool usage based on the available balance. Each tool description includes its credit cost.
3. Prefer cheaper tools when possible: local_pack (1 cr) over local_audit (50 cr) when a full audit isn't needed.
4. For multi-step analyses, estimate total cost upfront and warn the user if it will exceed 50% of their balance.
5. Composite tools (local_audit, citation_audit, geogrid_scan) are premium — confirm with the user before using them.
6. Every successful tool call response includes credits_used and credits_remaining — monitor these as you work.
7. If a tool returns an insufficient credits error, inform the user of their balance and the cost required.`,
  });

  registerAccountTools(server, getAuth);
  registerSerpTools(server, getAuth);
  registerBusinessTools(server, getAuth);
  registerReviewTools(server, getAuth);
  registerAuditTools(server, getAuth);
  registerGeogridTools(server, getAuth);
  registerReportTools(server, getAuth);
  registerIntelligenceTools(server, getAuth);
  registerKeywordTools(server, getAuth);
  registerBacklinkTools(server, getAuth);
  registerSiteTools(server, getAuth);
  registerAIVisibilityTools(server, getAuth);
  registerCompetitiveTools(server, getAuth);
  registerLocationTools(server, getAuth);
  registerDiagnosticTools(server, getAuth);

  return server;
}
