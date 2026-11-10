import { connection } from "next/server";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isValidSession, SESSION_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logoutAction } from "./actions";

export const instant = false;

const statusLabel: Record<string, string> = { open: "Novo", reviewing: "Em revisão", waiting_client: "Aguardando cliente", closed: "Encerrado" };

function field(value: string, key: "clientName" | "urgency"): string {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (key === "clientName") return typeof parsed.clientName === "string" && parsed.clientName ? parsed.clientName : "Cliente não identificado";
    return parsed.urgency === "high" ? "Alta" : parsed.urgency === "low" ? "Baixa" : "Normal";
  } catch {
    return key === "clientName" ? "Cliente não identificado" : "Normal";
  }
}

function urgencyClass(urgency: string): string {
  if (urgency === "Alta") return "bg-red-100 text-red-800";
  if (urgency === "Baixa") return "bg-slate-100 text-slate-700";
  return "bg-amber-100 text-amber-800";
}

type DashboardSearchParams = Promise<{ q?: string | string[]; status?: string | string[]; urgency?: string | string[] }>;

function singleParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export default async function LawyerDashboardPage({ searchParams }: { searchParams: DashboardSearchParams }) {
  await connection();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!isValidSession(token)) redirect("/lawyer/login");

  const params = await searchParams;
  const query = singleParam(params.q).slice(0, 100);
  const requestedStatus = singleParam(params.status);
  const statusFilter = ["open", "reviewing", "waiting_client", "closed"].includes(requestedStatus) ? requestedStatus : "";
  const requestedUrgency = singleParam(params.urgency);
  const urgencyFilter = ["high", "normal", "low"].includes(requestedUrgency) ? requestedUrgency : "";

  const matters = await prisma.matter.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    select: { id: true, status: true, intakeJson: true, updatedAt: true, conversation: { select: { waId: true, documents: { select: { id: true } } } } },
  });
  const statusPriority: Record<string, number> = { open: 0, reviewing: 1, waiting_client: 2, closed: 3 };
  const urgencyPriority: Record<string, number> = { Alta: 0, Normal: 1, Baixa: 2 };
  matters.sort((a, b) => {
    const statusOrder = (statusPriority[a.status] ?? 4) - (statusPriority[b.status] ?? 4);
    if (statusOrder !== 0) return statusOrder;
    const urgencyOrder = urgencyPriority[field(a.intakeJson, "urgency")] - urgencyPriority[field(b.intakeJson, "urgency")];
    return urgencyOrder || b.updatedAt.getTime() - a.updatedAt.getTime();
  });
  const openCount = matters.filter((matter) => matter.status !== "closed").length;
  const normalizedQuery = query.toLocaleLowerCase("pt-BR");
  const visibleMatters = matters.filter((matter) => {
    if (statusFilter && matter.status !== statusFilter) return false;
    let intake: Record<string, unknown> = {};
    try { intake = JSON.parse(matter.intakeJson) as Record<string, unknown>; } catch { /* ignore malformed legacy intake */ }
    if (urgencyFilter && intake.urgency !== urgencyFilter) return false;
    return !normalizedQuery
      || field(matter.intakeJson, "clientName").toLocaleLowerCase("pt-BR").includes(normalizedQuery)
      || matter.conversation.waId.includes(query);
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5"><div><p className="text-xs font-semibold tracking-[0.16em] text-blue-700">ASSISTENTE JURÍDICO</p><h1 className="mt-1 text-xl font-semibold">Atendimentos</h1></div><form action={logoutAction}><button className="text-sm font-medium text-slate-600 hover:text-slate-950" type="submit">Sair</button></form></div></header>
      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Casos ativos</p><p className="mt-2 text-3xl font-semibold">{openCount}</p></div><div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Total recebido</p><p className="mt-2 text-3xl font-semibold">{matters.length}</p></div><div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Uso seguro</p><p className="mt-2 text-sm font-medium text-slate-800">Revisão humana obrigatória</p></div></div>
        <form action="/lawyer" className="mt-8 grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
          <label className="sr-only" htmlFor="case-search">Buscar por cliente ou WhatsApp</label>
          <input id="case-search" name="q" defaultValue={query} maxLength={100} placeholder="Buscar por cliente ou WhatsApp" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <label className="sr-only" htmlFor="case-status">Filtrar por status</label>
          <select id="case-status" name="status" defaultValue={statusFilter} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">Todos os status</option><option value="open">Novo</option><option value="reviewing">Em revisão</option><option value="waiting_client">Aguardando cliente</option><option value="closed">Encerrado</option></select>
          <label className="sr-only" htmlFor="case-urgency">Filtrar por urgência</label>
          <select id="case-urgency" name="urgency" defaultValue={urgencyFilter} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">Todas as urgências</option><option value="high">Alta</option><option value="normal">Normal</option><option value="low">Baixa</option></select>
          <button type="submit" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">Filtrar</button>
        </form>
        <section className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold">Fila de revisão</h2></div>{matters.length === 0 ? <p className="px-5 py-12 text-center text-sm text-slate-500">Nenhum caso confirmado ainda. Eles aparecerão aqui após a triagem pelo WhatsApp.</p> : visibleMatters.length === 0 ? <p className="px-5 py-12 text-center text-sm text-slate-500">Nenhum atendimento corresponde aos filtros.</p> : <ul className="divide-y divide-slate-100">{visibleMatters.map((matter) => { const urgency = field(matter.intakeJson, "urgency"); return <li key={matter.id}><Link className="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between" href={`/lawyer/cases/${matter.id}`}><div><p className="font-medium text-slate-950">{field(matter.intakeJson, "clientName")}</p><p className="mt-1 text-sm text-slate-500">WhatsApp {matter.conversation.waId} · {matter.conversation.documents.length} documento(s)</p></div><div className="flex items-center gap-2 text-sm"><span className={`rounded-full px-2.5 py-1 font-medium ${urgencyClass(urgency)}`}>{urgency}</span><span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-800">{statusLabel[matter.status] ?? matter.status}</span></div></Link></li>; })}</ul>}</section>
      </section>
    </main>
  );
}
