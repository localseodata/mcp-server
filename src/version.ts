/** The MCP server's version, reported to clients on initialize and on
 *  /health. Bump it with every change to the tools: some clients cache the
 *  tool list per server version and only refetch when it changes. Must match
 *  package.json (checked in version.test.ts). */
export const MCP_SERVER_VERSION = "1.6.0";
