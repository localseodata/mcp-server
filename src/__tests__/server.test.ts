import { describe, it, expect, beforeAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "../server.js";

const mockAuth = () => "Bearer sk_test_mock";

let tools: Array<{ name: string; description?: string; inputSchema: Record<string, unknown> }>;

beforeAll(async () => {
  const server = createMcpServer(mockAuth);
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  const result = await client.listTools();
  tools = result.tools;
});

describe("MCP Server", () => {
  it("registers all 42 tools", () => {
    expect(tools.length).toBe(42);
  });

  it("every tool has a name and description", () => {
    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
    }
  });

  it("every tool has an input schema", () => {
    for (const tool of tools) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
    }
  });

  it("no duplicate tool names", () => {
    const names = tools.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every non-diagnostic tool description mentions credit cost", () => {
    const diagnostic = new Set(["ping"]);
    for (const tool of tools) {
      if (diagnostic.has(tool.name)) continue;
      expect(
        tool.description!.toLowerCase().includes("credit") || tool.description!.toLowerCase().includes("free"),
        `${tool.name} description should mention credit cost`,
      ).toBe(true);
    }
  });
});
