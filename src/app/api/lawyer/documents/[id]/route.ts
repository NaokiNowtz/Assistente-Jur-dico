import { readFile } from "fs/promises";
import path from "path";
import { cookies } from "next/headers";
import { isValidSession, SESSION_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { config } from "@/lib/env";

function safeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|\r\n]+/g, "_").slice(0, 120) || "documento";
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!isValidSession(token)) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document?.storagePath) return new Response("Not found", { status: 404 });
  const mediaDirectory = path.resolve(process.cwd(), config.mediaStorageDir) + path.sep;
  const absolutePath = path.resolve(document.storagePath);
  if (!absolutePath.startsWith(mediaDirectory)) return new Response("Not found", { status: 404 });
  try {
    const bytes = await readFile(absolutePath);
    return new Response(bytes, { headers: { "Content-Disposition": `attachment; filename="${safeFilename(document.filename || `documento-${document.id}`)}"`, "Content-Type": document.mimeType, "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
