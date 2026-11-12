import { checkAssistantRequest, clientIp, toHeaders } from "@/lib/chat/rate-limit";
import { db } from "@/lib/db/client";
import { handleMcpRequest } from "@/lib/mcp/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Solon's MCP endpoint: connect any AI app to the law register at
 * `https://solon.orangecat.ch/api/mcp`. Public and read-only, as the law is;
 * bounded per address. Stateless Streamable HTTP, so only POST is served.
 */
export async function POST(request: Request) {
  const limit = await checkAssistantRequest(clientIp(request.headers), "mcp");
  if (!limit.allowed)
    return Response.json(
      {
        jsonrpc: "2.0",
        error: { code: -32000, message: "Too many requests; wait a few minutes." },
        id: null,
      },
      { status: 429, headers: toHeaders(limit) },
    );
  return handleMcpRequest(request, db);
}

const notAllowed = () =>
  Response.json(
    {
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed: this server is stateless; POST JSON-RPC.",
      },
      id: null,
    },
    { status: 405, headers: { Allow: "POST" } },
  );
export const GET = notAllowed;
export const DELETE = notAllowed;
