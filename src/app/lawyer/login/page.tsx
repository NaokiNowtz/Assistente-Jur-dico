import { connection } from "next/server";
import Link from "next/link";
import { config } from "@/lib/env";
import { loginAction } from "../actions";

export const instant = false;

export default async function LawyerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  await connection();
  const { error } = await searchParams;
  const configured = config.lawyerPassword.length > 0;
  const errorCode = Array.isArray(error) ? error[0] : error;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-900 sm:flex sm:items-center sm:justify-center">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl shadow-black/30 sm:p-10">
        <p className="text-sm font-semibold tracking-[0.18em] text-blue-700">ASSISTENTE JURÍDICO</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">Área do advogado</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Acesse atendimentos, documentos e pendências recebidos pelo WhatsApp.
        </p>
        {!configured ? (
          <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            O acesso ainda não foi configurado. Defina uma senha forte em <code>LAWYER_PASSWORD</code> no arquivo de ambiente do servidor.
          </p>
        ) : null}
        {configured && errorCode ? <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{errorCode === "locked" ? "Muitas tentativas. Aguarde 15 minutos antes de tentar novamente." : "Senha inválida. Tente novamente."}</p> : null}
        {configured ? (
          <form action={loginAction} className="mt-7 space-y-5">
            <label className="block text-sm font-medium text-slate-800" htmlFor="password">Senha</label>
            <input className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-600 focus:ring-3 focus:ring-blue-100" id="password" name="password" type="password" autoComplete="current-password" required />
            <button className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-3 focus:ring-blue-200" type="submit">Entrar</button>
          </form>
        ) : null}
        <Link className="mt-6 inline-block text-sm text-slate-500 hover:text-slate-800" href="/">Voltar ao início</Link>
      </section>
    </main>
  );
}
