import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server.js";
import { TOOLSETS, type ToolsetSlug } from "./toolsets.js";

// Over stdio, stdout carries the JSON-RPC stream, so any log line written
// there corrupts it. Send all logging to stderr instead.
console.log = console.error;
console.info = console.error;

const getAuth = () => {
  const key = process.env.LOCALSEODATA_API_KEY;
  if (!key) throw new Error("Set LOCALSEODATA_API_KEY environment variable");
  return `Bearer ${key}`;
};

// Same server, same tools as the hosted endpoint at mcp.localseodata.com/mcp.
// LOCALSEODATA_TOOLSET=reviews (or apple-bing, ai-visibility) runs one of the
// focused servers instead.
const toolset = process.env.LOCALSEODATA_TOOLSET;
if (toolset && !(toolset in TOOLSETS)) {
  throw new Error(`Unknown LOCALSEODATA_TOOLSET "${toolset}". Use one of: ${Object.keys(TOOLSETS).join(", ")}`);
}
const server = createMcpServer(getAuth, toolset as ToolsetSlug | undefined);
const transport = new StdioServerTransport();
await server.connect(transport);
