import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server.js";

const getAuth = () => {
  const key = process.env.LOCALSEODATA_API_KEY;
  if (!key) throw new Error("Set LOCALSEODATA_API_KEY environment variable");
  return `Bearer ${key}`;
};

const server = createMcpServer(getAuth);
const transport = new StdioServerTransport();
await server.connect(transport);
