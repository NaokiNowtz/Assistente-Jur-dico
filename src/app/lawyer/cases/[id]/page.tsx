import { connection } from "next/server";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isValidSession, SESSION_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logoutAction, updateMatterAction } from "../../actions";

export const instant = false;

const statusOptions = [{ value: "open", label: "Novo" }, { value: "reviewing", label: "Em revisão" }, { value: "waiting_client", label: "Aguardando cliente" }, { value: "closed", label: "Encerrado" }];
const labels: Record<string, string> = { clientName: "Nome", matterArea: "Área", opposingParty: "Outra parte", timeline: "Quando ocorreu", desiredOutcome: "Objetivo", urgency: "Urgência", facts: "Fatos informados" };

function intakeEntries(value: string): Array<[string, string]> {
  try { const intake = JSON.parse(value) as Record<string, unknown>; return Object.entries(labels).filter(([key]) => typeof intake[key] === "string" && intake[key]).map(([key, label]) => [label, String(intake[key])]); } catch { return []; }
}

export default async function LawyerCasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string | string[] }>;
}) {
  await connection();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!isValidSession(token)) redirect("/lawyer/login");
  const { id } = await params;
  const { saved } = await searchParams;
  const matter = await prisma.matter.findUnique({ where: { id }, include: { conversation: { include: { documents: { orderBy: { createdAt: "desc" } }, messages: { orderBy: { createdAt: "asc" } } } } } });
  if (!matter) notFound();
  const intake = intakeEntries(matter.intakeJson);

  return <main className="min-h-screen bg-slate-50 text-slate-900"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5"><Link className="text-sm font-medium text-slate-600 hover:text-slate-950" href="/lawyer">← Todos os atendimentos</Link><form action={logoutAction}><button className="text-sm font-medium text-slate-600 hover:text-slate-950" type="submit">Sair</button></form></div></header><section className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_22rem]"><div className="space-y-6"><section className="rounded-xl border border-slate-200 bg-white p-6"><p className="text-xs font-semibold tracking-[0.16em] text-blue-700">CASO</p><h1 className="mt-2 text-2xl font-semibold">Atendimento pelo WhatsApp</h1><p className="mt-2 text-sm text-slate-500">Contato: {matter.conversation.waId}</p><dl className="mt-6 divide-y divide-slate-100 rounded-lg border border-slate-200">{intake.length === 0 ? <div className="px-4 py-3 text-sm text-slate-500">Não foi possível ler o resumo da triagem.</div> : intake.map(([label, value]) => <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4" key={label}><dt className="text-sm font-medium text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-slate-900 sm:col-span-2 sm:mt-0">{value}</dd></div>)}</dl></section><section className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-semibold">Documentos</h2>{matter.conversation.documents.length === 0 ? <p className="mt-4 text-sm text-slate-500">Nenhum documento enviado.</p> : <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">{matter.conversation.documents.map((document) => <li className="px-4 py-3" key={document.id}><a className="font-medium text-blue-700 hover:text-blue-900" href={`/api/lawyer/documents/${document.id}`}>{document.filename || "Arquivo recebido"}</a><p className="mt-1 text-xs text-slate-500">{document.mimeType}</p>{document.reviewJson ? <details className="mt-3 text-sm text-slate-600"><summary className="cursor-pointer font-medium text-slate-800">Análise preliminar</summary><pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded bg-slate-50 p-3 text-xs">{document.reviewJson}</pre></details> : null}</li>)}</ul>}</section><section className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-semibold">Histórico da conversa</h2><ol className="mt-4 space-y-3">{matter.conversation.messages.map((message) => <li className={`rounded-lg px-4 py-3 text-sm ${message.direction === "inbound" ? "bg-slate-100" : "bg-blue-50"}`} key={message.id}><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{message.direction === "inbound" ? "Cliente" : "Assistente"} · {message.type}</p><p className="mt-1 whitespace-pre-wrap text-slate-800">{message.body || "Sem texto"}</p></li>)}</ol></section></div><aside className="h-fit rounded-xl border border-slate-200 bg-white p-6 lg:sticky lg:top-6"><h2 className="text-lg font-semibold">Revisão do advogado</h2>{saved ? <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Atualização salva.</p> : null}<form action={updateMatterAction} className="mt-5 space-y-4"><input name="matterId" type="hidden" value={matter.id} /><label className="block text-sm font-medium text-slate-700" htmlFor="status">Status</label><select className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" defaultValue={matter.status} id="status" name="status">{statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><label className="block text-sm font-medium text-slate-700" htmlFor="lawyerNotes">Notas internas</label><textarea className="mt-1 min-h-40 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" defaultValue={matter.lawyerNotes ?? ""} id="lawyerNotes" name="lawyerNotes" placeholder="Estas notas não são enviadas ao cliente." /><button className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800" type="submit">Salvar revisão</button></form></aside></section></main>;
}
