import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSerpTools } from "./tools/serp.js";
import { registerPlatformTools } from "./tools/platforms.js";
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
import { AGENT_INSTRUCTIONS } from "./instructions.js";
import { lenientOutput } from "./lenient-output.js";

export function createMcpServer(getAuth: () => string): McpServer {
  const server = new McpServer(
    {
      name: "localseodata",
      version: "1.0.1",
      description: "53 local SEO data tools: rankings, reviews, audits, keyword research, competitor analysis, geogrid tracking, and AI visibility scoring.",
    },
    {
      instructions: AGENT_INSTRUCTIONS,
    },
  );

  // Every tool's advertised output schema accepts fields it doesn't list
  // (see lenient-output.ts). Applied once here so no tool can opt out by
  // accident.
  const registerTool = server.registerTool.bind(server) as (...args: unknown[]) => unknown;
  (server as unknown as { registerTool: (...args: unknown[]) => unknown }).registerTool = (
    ...args: unknown[]
  ) => {
    const [name, config, ...rest] = args as [unknown, { outputSchema?: unknown }, ...unknown[]];
    const outputSchema = config?.outputSchema;
    const lenient =
      outputSchema instanceof z.ZodType
        ? lenientOutput(outputSchema)
        : outputSchema && typeof outputSchema === "object"
          ? lenientOutput(z.object(outputSchema as z.ZodRawShape))
          : outputSchema;
    return registerTool(name, { ...config, outputSchema: lenient }, ...rest);
  };

  registerAccountTools(server, getAuth);
  registerSerpTools(server, getAuth);
  registerPlatformTools(server, getAuth);
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
