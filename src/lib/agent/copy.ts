import type { Intake, Lang, Outbound } from "./types";

const DISCLAIMER = {
  "pt-BR":
    "Sou um assistente do escritório para coletar informações. Isto não é aconselhamento jurídico. Um advogado humano revisará o caso antes de qualquer orientação. Seus dados são tratados conforme a LGPD, só para atendimento do escritório.",
  es: "Soy un asistente del despacho para reunir información. Esto no es asesoramiento jurídico. Un abogado humano revisará el caso antes de cualquier orientación. Sus datos se tratan para la atención del despacho.",
};

export const copy = {
  welcome: (lang: Lang): Outbound => ({
    text:
      lang === "es"
        ? `Hola. ${DISCLAIMER.es}\n\n¿Acepta continuar y que guardemos lo necesario para que un abogado le contacte?`
        : `Olá. ${DISCLAIMER["pt-BR"]}\n\nAceita continuar e que guardemos o necessário para um advogado entrar em contato?`,
    buttons: [
      { id: "consent_yes", title: lang === "es" ? "Acepto" : "Aceito" },
      { id: "consent_no", title: lang === "es" ? "No ahora" : "Agora não" },
    ],
  }),
  consentAgain: (lang: Lang): Outbound => ({
    text:
      lang === "es"
        ? "Para seguir, necesito su consentimiento. ¿Acepta?"
        : "Para continuar, preciso do seu consentimento. Aceita?",
    buttons: [
      { id: "consent_yes", title: lang === "es" ? "Acepto" : "Aceito" },
      { id: "consent_no", title: lang === "es" ? "No ahora" : "Agora não" },
    ],
  }),
  declined: (lang: Lang): string =>
    lang === "es"
      ? "De acuerdo. Cuando quiera retomar, escriba de nuevo. Un abogado puede atenderle por este número."
      : "Tudo bem. Quando quiser retomar, escreva de novo. Um advogado pode atender por este número.",
  askName: (lang: Lang): string =>
    lang === "es" ? "¿Cuál es su nombre completo?" : "Qual é o seu nome completo?",
  askArea: (lang: Lang): Outbound => ({
    text: lang === "es" ? "¿Cuál es el área del asunto?" : "Qual é a área do caso?",
    list: {
      button: lang === "es" ? "Áreas" : "Áreas",
      rows: [
        { id: "area_trabalhista", title: lang === "es" ? "Laboral" : "Trabalhista" },
        { id: "area_civil", title: "Civil" },
        { id: "area_familia", title: lang === "es" ? "Familia" : "Família" },
        { id: "area_consumidor", title: lang === "es" ? "Consumo" : "Consumidor" },
        { id: "area_other", title: lang === "es" ? "Otra" : "Outra" },
      ],
    },
  }),
  askOpposing: (lang: Lang): string =>
    lang === "es"
      ? "¿Quién es la otra parte (empresa, persona o institución)?"
      : "Quem é a outra parte (empresa, pessoa ou instituição)?",
  askTimeline: (lang: Lang): string =>
    lang === "es"
      ? "¿Cuándo ocurrió lo principal? Fechas aproximadas sirven."
      : "Quando aconteceu o principal? Datas aproximadas servem.",
  askOutcome: (lang: Lang): string =>
    lang === "es" ? "¿Qué resultado busca?" : "Qual resultado você busca?",
  askUrgency: (lang: Lang): Outbound => ({
    text: lang === "es" ? "¿Cuál es la urgencia?" : "Qual é a urgência?",
    buttons: [
      { id: "urgency_high", title: lang === "es" ? "Alta" : "Alta" },
      { id: "urgency_normal", title: lang === "es" ? "Normal" : "Normal" },
      { id: "urgency_low", title: lang === "es" ? "Baja" : "Baixa" },
    ],
  }),
  askFacts: (lang: Lang): string =>
    lang === "es"
      ? "Cuente los hechos con calma, en sus palabras. Un abogado revisará; no puedo decirle si ganará el caso."
      : "Conte os fatos com calma, nas suas palavras. Um advogado revisará; não posso dizer se o caso será ganho.",
  askDocuments: (lang: Lang): Outbound => ({
    text:
      lang === "es"
        ? "Si tiene contrato, petición u otra pieza, envíe PDF o foto ahora. Si no tiene, elija Saltar."
        : "Se tiver contrato, petição ou outro documento, envie PDF ou foto agora. Se não tiver, escolha Pular.",
    buttons: [{ id: "docs_skip", title: lang === "es" ? "Saltar" : "Pular" }],
  }),
  receivedDoc: (lang: Lang): string =>
    lang === "es"
      ? "Documento recibido. Un abogado lo revisará. Esto no es un dictamen jurídico."
      : "Documento recebido. Um advogado fará a revisão. Isto não é um parecer jurídico.",
  confirm: (lang: Lang, summary: string): Outbound => ({
    text:
      (lang === "es"
        ? "Resumen para confirmar (solo recolección de datos):\n\n"
        : "Resumo para confirmar (apenas coleta de dados):\n\n") +
      summary +
      (lang === "es"
        ? "\n\n¿Confirma para que un abogado humano le contacte?"
        : "\n\nConfirma para um advogado humano entrar em contato?"),
    buttons: [
      { id: "confirm_yes", title: lang === "es" ? "Confirmar" : "Confirmar" },
      { id: "confirm_no", title: lang === "es" ? "Corregir" : "Corrigir" },
    ],
  }),
  handedOff: (lang: Lang): string =>
    lang === "es"
      ? "Listo. Un abogado del despacho revisará su caso y le contactará. Si surge algo urgente, escriba aquí."
      : "Pronto. Um advogado do escritório revisará o caso e entrará em contato. Se surgir algo urgente, escreva aqui.",
  rateLimited: (lang: Lang): string =>
    lang === "es"
      ? "Hay muchos mensajes seguidos. Espere un momento e inténtelo de nuevo."
      : "Muitas mensagens seguidas. Aguarde um momento e tente de novo.",
  outOfScope: (lang: Lang): string =>
    lang === "es"
      ? "Este pedido queda fuera de lo que puedo tramitar por chat. Un abogado humano lo verá. No puedo ayudar a evadir la ley."
      : "Este pedido fica fora do que posso tratar por chat. Um advogado humano verá. Não posso ajudar a burlar a lei.",
  alreadyDone: (lang: Lang): string =>
    lang === "es"
      ? "Su ficha ya está con el despacho. Un abogado le contactará. Puede enviar un complemento y lo anexaremos."
      : "Sua ficha já está com o escritório. Um advogado entrará em contato. Pode enviar um complemento que anexaremos.",
};

export function formatIntakeSummary(intake: Intake, lang: Lang): string {
  const labels =
    lang === "es"
      ? {
          name: "Nombre",
          area: "Área",
          other: "Otra parte",
          when: "Cuándo",
          goal: "Resultado buscado",
          urgency: "Urgencia",
          facts: "Hechos",
        }
      : {
          name: "Nome",
          area: "Área",
          other: "Outra parte",
          when: "Quando",
          goal: "Resultado buscado",
          urgency: "Urgência",
          facts: "Fatos",
        };
  const lines = [
    `${labels.name}: ${intake.clientName ?? "—"}`,
    `${labels.area}: ${intake.matterArea ?? "—"}`,
    `${labels.other}: ${intake.opposingParty ?? "—"}`,
    `${labels.when}: ${intake.timeline ?? "—"}`,
    `${labels.goal}: ${intake.desiredOutcome ?? "—"}`,
    `${labels.urgency}: ${intake.urgency ?? "—"}`,
    `${labels.facts}: ${intake.facts ?? "—"}`,
  ];
  return lines.join("\n");
}
