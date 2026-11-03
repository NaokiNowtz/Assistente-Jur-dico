import { connection } from "next/server";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isValidSession, SESSION_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { addMatterUpdateAction, logoutAction, updateMatterAction } from "../../actions";

export const instant = false;

const statusOptions = [
  { value: "open", label: "Novo" },
  { value: "reviewing", label: "Em revisão" },
  { value: "waiting_client", label: "Aguardando cliente" },
  { value: "closed", label: "Encerrado" },
];

const intakeLabels: Record<string, string> = {
  clientName: "Nome",
  matterArea: "Área",
  opposingParty: "Outra parte",
  timeline: "Quando ocorreu",
  desiredOutcome: "Objetivo",
  urgency: "Urgência",
  facts: "Fatos informados",
};

function intakeEntries(value: string): Array<[string, string]> {
  try {
    const intake = JSON.parse(value) as Record<string, unknown>;
    return Object.entries(intakeLabels)
      .filter(([key]) => typeof intake[key] === "string" && intake[key])
      .map(([key, label]) => [label, String(intake[key])]);
  } catch {
    return [];
  }
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "UTC" }).format(value);
}

export default async function LawyerCasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string | string[]; updateSaved?: string | string[]; error?: string | string[] }>;
}) {
  await connection();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!isValidSession(token)) redirect("/lawyer/login");

  const { id } = await params;
  const { saved, updateSaved, error } = await searchParams;
  const matter = await prisma.matter.findUnique({
    where: { id },
    include: {
      updates: { orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }] },
      conversation: {
        include: {
          documents: { orderBy: { createdAt: "desc" } },
          messages: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
  if (!matter) notFound();

  const intake = intakeEntries(matter.intakeJson);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link className="text-sm font-medium text-slate-600 hover:text-slate-950" href="/lawyer">
            ← Todos os atendimentos
          </Link>
          <form action={logoutAction}>
            <button className="text-sm font-medium text-slate-600 hover:text-slate-950" type="submit">Sair</button>
          </form>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-xs font-semibold tracking-[0.16em] text-blue-700">CASO</p>
            <h1 className="mt-2 text-2xl font-semibold">Atendimento pelo WhatsApp</h1>
            <p className="mt-2 text-sm text-slate-500">Contato: {matter.conversation.waId}</p>
            <dl className="mt-6 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {intake.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-500">Não foi possível ler o resumo da triagem.</div>
              ) : intake.map(([label, value]) => (
                <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4" key={label}>
                  <dt className="text-sm font-medium text-slate-500">{label}</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-900 sm:col-span-2 sm:mt-0">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Andamentos do processo</h2>
              <span className="text-xs text-slate-500">Registro interno do escritório</span>
            </div>
            {matter.updates.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Nenhum andamento registrado.</p>
            ) : (
              <ol className="mt-5 space-y-5 border-l border-slate-200 pl-5">
                {matter.updates.map((update) => (
                  <li className="relative" key={update.id}>
                    <span className="absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full bg-blue-600" />
                    <p className="text-xs font-medium text-slate-500">{formatDate(update.occurredAt)}</p>
                    <h3 className="mt-1 font-medium text-slate-900">{update.title}</h3>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{update.details}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold">Documentos</h2>
            {matter.conversation.documents.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Nenhum documento enviado.</p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
                {matter.conversation.documents.map((document) => (
                  <li className="px-4 py-3" key={document.id}>
                    <a className="font-medium text-blue-700 hover:text-blue-900" href={`/api/lawyer/documents/${document.id}`}>
                      {document.filename || "Arquivo recebido"}
                    </a>
                    <p className="mt-1 text-xs text-slate-500">{document.mimeType}</p>
                    {document.reviewJson ? (
                      <details className="mt-3 text-sm text-slate-600">
                        <summary className="cursor-pointer font-medium text-slate-800">Análise preliminar</summary>
                        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded bg-slate-50 p-3 text-xs">{document.reviewJson}</pre>
                      </details>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold">Histórico da conversa</h2>
            <ol className="mt-4 space-y-3">
              {matter.conversation.messages.map((message) => (
                <li className={`rounded-lg px-4 py-3 text-sm ${message.direction === "inbound" ? "bg-slate-100" : "bg-blue-50"}`} key={message.id}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {message.direction === "inbound" ? "Cliente" : "Assistente"} · {message.type}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-slate-800">{message.body || "Sem texto"}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-6 lg:sticky lg:top-6">
          <h2 className="text-lg font-semibold">Revisão do advogado</h2>
          {saved ? <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Revisão salva.</p> : null}
          {updateSaved ? <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Andamento registrado.</p> : null}
          {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">Confira o título, a descrição e a data do andamento.</p> : null}

          <form action={addMatterUpdateAction} className="mt-5 space-y-3 border-b border-slate-200 pb-5">
            <input name="matterId" type="hidden" value={matter.id} />
            <h3 className="text-sm font-semibold text-slate-800">Registrar andamento</h3>
            <label className="block text-sm font-medium text-slate-700" htmlFor="update-title">Título</label>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" id="update-title" maxLength={160} name="title" required />
            <label className="block text-sm font-medium text-slate-700" htmlFor="update-details">Descrição</label>
            <textarea className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" id="update-details" maxLength={5000} name="details" required />
            <label className="block text-sm font-medium text-slate-700" htmlFor="update-date">Data do andamento</label>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" defaultValue={today} id="update-date" name="occurredAt" required type="date" />
            <button className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800" type="submit">
              Adicionar andamento
            </button>
          </form>

          <form action={updateMatterAction} className="mt-5 space-y-4">
            <input name="matterId" type="hidden" value={matter.id} />
            <label className="block text-sm font-medium text-slate-700" htmlFor="status">Status</label>
            <select className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" defaultValue={matter.status} id="status" name="status">
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <label className="block text-sm font-medium text-slate-700" htmlFor="lawyerNotes">Notas internas</label>
            <textarea className="mt-1 min-h-40 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" defaultValue={matter.lawyerNotes ?? ""} id="lawyerNotes" name="lawyerNotes" placeholder="Estas notas não são enviadas ao cliente." />
            <button className="w-full rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-900" type="submit">Salvar revisão</button>
          </form>
        </aside>
      </section>
    </main>
  );
}
