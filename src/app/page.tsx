import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section className="max-w-xl text-center">
        <p className="text-sm font-semibold tracking-[0.2em] text-blue-300">ASSISTENTE JURÍDICO</p>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight">Triagem responsável pelo WhatsApp</h1>
        <p className="mt-5 text-base leading-7 text-slate-300">
          Atendimento inicial com consentimento, coleta de documentos e revisão obrigatória por advogado.
        </p>
        <Link className="mt-8 inline-flex rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100" href="/lawyer">
          Acessar área do advogado
        </Link>
      </section>
    </main>
  );
}
