import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server.js";

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
const server = createMcpServer(getAuth);
const transport = new StdioServerTransport();
await server.connect(transport);
