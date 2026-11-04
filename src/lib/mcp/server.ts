import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const matterStatuses = ["open", "reviewing", "waiting_client", "closed"] as const;

function readIntake(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function textResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

export function createLawyerMcpServer(): McpServer {
  const server = new McpServer({ name: "assistente-juridico", version: "0.1.0" });

  server.registerTool(
    "list_cases",
    {
      title: "Listar casos",
      description: "Lista casos do escritório por status, mostrando apenas dados resumidos. Não oferece orientação jurídica.",
      inputSchema: z.object({
        status: z.enum(matterStatuses).optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ status, limit }) => {
      const matters = await prisma.matter.findMany({
        where: status ? { status } : undefined,
        orderBy: { updatedAt: "desc" },
        take: limit,
        select: {
          id: true,
          status: true,
          updatedAt: true,
          intakeJson: true,
          updates: {
            orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
            take: 1,
            select: { title: true, details: true, occurredAt: true, source: true },
          },
        },
      });

      return textResult(
        matters.map((matter) => {
          const intake = readIntake(matter.intakeJson);
          return {
            id: matter.id,
            status: matter.status,
            clientName: typeof intake.clientName === "string" ? intake.clientName : "Não identificado",
            matterArea: typeof intake.matterArea === "string" ? intake.matterArea : null,
            urgency: typeof intake.urgency === "string" ? intake.urgency : "normal",
            updatedAt: matter.updatedAt.toISOString(),
            latestUpdate: matter.updates[0]
              ? { ...matter.updates[0], occurredAt: matter.updates[0].occurredAt.toISOString() }
              : null,
          };
        }),
      );
    },
  );

  server.registerTool(
    "get_case_details",
    {
      title: "Consultar caso",
      description: "Consulta triagem, andamentos, metadados dos documentos e mensagens recentes de um caso. Não retorna arquivos nem caminhos locais.",
      inputSchema: z.object({ matterId: z.string().cuid() }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ matterId }) => {
      const matter = await prisma.matter.findUnique({
        where: { id: matterId },
        select: {
          id: true,
          status: true,
          lawyerNotes: true,
          createdAt: true,
          updatedAt: true,
          intakeJson: true,
          updates: {
            orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
            take: 100,
            select: { title: true, details: true, occurredAt: true, createdAt: true, source: true },
          },
          conversation: {
            select: {
              language: true,
              state: true,
              documents: {
                orderBy: { createdAt: "desc" },
                take: 50,
                select: { filename: true, mimeType: true, reviewJson: true, createdAt: true },
              },
              messages: {
                orderBy: { createdAt: "desc" },
                take: 30,
                select: { direction: true, type: true, body: true, createdAt: true },
              },
            },
          },
        },
      });

      if (!matter) return textResult({ error: "Caso não encontrado." });
      return textResult({
        id: matter.id,
        status: matter.status,
        createdAt: matter.createdAt.toISOString(),
        updatedAt: matter.updatedAt.toISOString(),
        intake: readIntake(matter.intakeJson),
        lawyerNotes: matter.lawyerNotes,
        updates: matter.updates.map((update) => ({
          ...update,
          occurredAt: update.occurredAt.toISOString(),
          createdAt: update.createdAt.toISOString(),
        })),
        conversation: {
          language: matter.conversation.language,
          state: matter.conversation.state,
          documents: matter.conversation.documents.map((document) => ({
            filename: document.filename,
            mimeType: document.mimeType,
            review: document.reviewJson,
            receivedAt: document.createdAt.toISOString(),
          })),
          recentMessages: matter.conversation.messages
            .reverse()
            .map((message) => ({
              direction: message.direction,
              type: message.type,
              body: message.body,
              createdAt: message.createdAt.toISOString(),
            })),
        },
      });
    },
  );

  server.registerTool(
    "add_case_update",
    {
      title: "Registrar andamento",
      description: "Registra no histórico do caso um andamento fornecido pelo advogado. Use apenas informações confirmadas pelo advogado; não invente movimentações nem aconselhe o cliente.",
      inputSchema: z.object({
        matterId: z.string().cuid(),
        title: z.string().trim().min(3).max(160),
        details: z.string().trim().min(3).max(5_000),
        occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ matterId, title, details, occurredAt }) => {
      const date = new Date(`${occurredAt}T12:00:00.000Z`);
      if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== occurredAt) {
        return textResult({ error: "Data inválida; use o formato AAAA-MM-DD." });
      }

      const matter = await prisma.matter.findUnique({ where: { id: matterId }, select: { id: true } });
      if (!matter) return textResult({ error: "Caso não encontrado." });

      const update = await prisma.matterUpdate.create({
        data: { matterId, title, details, occurredAt: date, source: "mcp" },
        select: { id: true, title: true, details: true, occurredAt: true },
      });

      return textResult({
        saved: true,
        ...update,
        occurredAt: update.occurredAt.toISOString().slice(0, 10),
        source: "mcp",
      });
    },
  );

  return server;
}
