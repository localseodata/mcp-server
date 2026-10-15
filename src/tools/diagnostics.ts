import { createHash } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { env } from "../config.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

export function registerDiagnosticTools(server: McpServer, getAuth: () => string) {
  server.registerTool(
    "ping",
    {
      description: "Use when diagnosing connection or authentication issues. Tests API connectivity end-to-end by verifying the API key against the backend. Free (0 credits).",
      annotations: { ...READ_ONLY, title: "Connection Diagnostics" },
    },
    async () => {
      const lines: string[] = [];
      let failed = false;

      let authHeader: string;
      let rawKey: string;
      try {
        authHeader = getAuth();
        lines.push(`Auth header format: ${authHeader.startsWith("Bearer ") ? "Bearer <key>" : "UNEXPECTED: " + authHeader.slice(0, 20)}`);

        rawKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
        lines.push(`Key prefix: ${rawKey.slice(0, 12)}`);
        lines.push(`Key length: ${rawKey.length}`);
        lines.push(`Key suffix: ...${rawKey.slice(-4)}`);

        const keyHash = createHash("sha256").update(rawKey).digest("hex");
        lines.push(`Key SHA256: ${keyHash.slice(0, 16)}...`);
      } catch (err) {
        lines.push(`Auth error: ${err instanceof Error ? err.message : String(err)}`);
        return { content: [{ type: "text" as const, text: lines.join("\n") }], isError: true };
      }

      lines.push(`API base URL: ${env.API_BASE_URL}`);

      try {
        const healthRes = await fetch(`${env.API_BASE_URL}/health`);
        lines.push(`Health check: ${healthRes.status} ${healthRes.statusText}`);
        if (!healthRes.ok) failed = true;
      } catch (err) {
        lines.push(`Health check FAILED: ${err instanceof Error ? err.message : String(err)}`);
        failed = true;
      }

      try {
        const res = await fetch(`${env.API_BASE_URL}/v1/account/balance`, {
          method: "GET",
          headers: { Authorization: authHeader },
        });
        const text = await res.text();
        if (res.ok) {
          lines.push(`Auth middleware: OK (${res.status})`);
          try {
            const data = JSON.parse(text);
            if (data.credits_remaining !== undefined) {
              lines.push(`Credits remaining: ${data.credits_remaining}`);
            }
            if (data.data?.plan) {
              lines.push(`Plan: ${data.data.plan.name}`);
            }
          } catch { /* ignore parse errors */ }
        } else {
          lines.push(`Auth middleware: FAILED ${res.status} — ${text.slice(0, 300)}`);
          failed = true;
        }
      } catch (err) {
        lines.push(`Auth middleware error: ${err instanceof Error ? err.message : String(err)}`);
        failed = true;
      }

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
        ...(failed && { isError: true }),
      };
    }
  );
}
