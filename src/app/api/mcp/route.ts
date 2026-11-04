import { createMcpHandler } from "@modelcontextprotocol/server";
import { createLawyerMcpServer } from "@/lib/mcp/server";

const handler = createMcpHandler(() => createLawyerMcpServer());

function isLocalDevelopmentRequest(request: Request): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  const host = request.headers.get("host")?.toLowerCase().split(":")[0];
  return host === "localhost" || host === "127.0.0.1";
}

function unavailable(): Response {
  return Response.json({ error: "MCP is available only in local development until OAuth is configured." }, { status: 404 });
}

export async function POST(request: Request): Promise<Response> {
  if (!isLocalDevelopmentRequest(request)) return unavailable();
  return handler.fetch(request);
}

export async function GET(request: Request): Promise<Response> {
  if (!isLocalDevelopmentRequest(request)) return unavailable();
  return handler.fetch(request);
}
