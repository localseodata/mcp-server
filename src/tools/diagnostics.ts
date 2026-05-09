import { createHash } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { env } from "../config.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

export function registerDiagnosticTools(server: McpServer, getAuth: () => string) {
  server.tool(
    "ping",
    "Test connectivity and auth. Verifies the API key works end-to-end by making a lightweight call to the backend API health endpoint with your credentials. Use this to diagnose connection or authentication issues.",
    {},
    READ_ONLY,
    async () => {
      const lines: string[] = [];

      // Check auth header
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

      // Test 1: Health endpoint (unauthenticated)
      try {
        const healthRes = await fetch(`${env.API_BASE_URL}/health`);
        lines.push(`Health check: ${healthRes.status} ${healthRes.statusText}`);
      } catch (err) {
        lines.push(`Health check FAILED: ${err instanceof Error ? err.message : String(err)}`);
      }

      // Test 2: Direct key validation (bypasses auth middleware)
      try {
        const debugRes = await fetch(`${env.API_BASE_URL}/debug/auth-test?key=${encodeURIComponent(rawKey)}`);
        const debugText = await debugRes.text();
        lines.push(`Direct validation: ${debugRes.status} — ${debugText.slice(0, 300)}`);
      } catch (err) {
        lines.push(`Direct validation FAILED: ${err instanceof Error ? err.message : String(err)}`);
      }

      // Test 3: Authenticated call through middleware
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
        }
      } catch (err) {
        lines.push(`Auth middleware error: ${err instanceof Error ? err.message : String(err)}`);
      }

      const hasError = lines.some((l) => l.includes("FAILED") || l.includes("error"));
      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
        ...(hasError && { isError: true }),
      };
    }
  );
}
