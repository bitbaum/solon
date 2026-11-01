/**
 * Solon's MCP server: Streamable HTTP, stateless, public and read-only, as the
 * law is. A fresh server and transport per request (OrangeCat's pattern), JSON
 * responses, nothing held between calls. The tools are the law register's
 * (`src/lib/law/tools.ts`), the same ones Solon's own law chat calls.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Database } from "@/lib/db/client";
import { LAW_TOOLS, runLawTool } from "@/lib/law/tools";

export const MCP_SERVER_INFO = { name: "solon", title: "Solon", version: "1.0.0" } as const;

const INSTRUCTIONS =
  "Solon holds the law of Switzerland (the Confederation, intercantonal law and all 26 cantons), of Liechtenstein, and of communes that publish a collection, " +
  "as the publishers publish it: every act's provisions in force, each with the publisher's page it was read from and the sha256 of that page. " +
  "Search with the law's own words in its language (German, French or Italian), narrow by authority, then read the provision and cite it with its link. " +
  "Federal law applies throughout Switzerland; a canton's law adds to it; a commune's applies in that commune. Solon states what the law says; it is not advice.";

async function call(name: string, args: unknown, db: Database): Promise<CallToolResult> {
  const outcome = await runLawTool(name, args, { db });
  if (!outcome.ok) return { isError: true, content: [{ type: "text", text: outcome.error }] };
  return {
    content: [{ type: "text", text: JSON.stringify(outcome.result, null, 2) }],
    structuredContent: outcome.result,
  };
}

export function createSolonMcpServer(db: Database): McpServer {
  const server = new McpServer(MCP_SERVER_INFO, { instructions: INSTRUCTIONS });
  for (const tool of LAW_TOOLS) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.input,
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      },
      ((args: unknown) => call(tool.name, args, db)) as never,
    );
  }
  return server;
}

/** Answer one Streamable HTTP request. */
export async function handleMcpRequest(request: Request, db: Database): Promise<Response> {
  const server = createSolonMcpServer(db);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    void server.close();
  }
}
