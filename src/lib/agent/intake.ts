import type { Intake, Lang, Outbound, Urgency } from "./types";
import { copy } from "./copy";

export const INTAKE_FIELDS: (keyof Intake)[] = [
  "clientName",
  "matterArea",
  "opposingParty",
  "timeline",
  "desiredOutcome",
  "urgency",
  "facts",
];

const AREA_MAP: Record<string, string> = {
  area_trabalhista: "trabalhista",
  trabalhista: "trabalhista",
  laboral: "trabalhista",
  labor: "trabalhista",
  area_civil: "civil",
  civil: "civil",
  area_familia: "familia",
  familia: "familia",
  família: "familia",
  family: "familia",
  area_consumidor: "consumidor",
  consumidor: "consumidor",
  consumo: "consumidor",
  consumer: "consumidor",
  area_other: "other",
  other: "other",
  outra: "other",
  otro: "other",
};

export function nextMissingField(intake: Intake): keyof Intake | null {
  return INTAKE_FIELDS.find((field) => !intake[field]) ?? null;
}

export function questionFor(field: keyof Intake, lang: Lang): Outbound {
  switch (field) {
    case "clientName":
      return { text: copy.askName(lang) };
    case "matterArea":
      return copy.askArea(lang);
    case "opposingParty":
      return { text: copy.askOpposing(lang) };
    case "timeline":
      return { text: copy.askTimeline(lang) };
    case "desiredOutcome":
      return { text: copy.askOutcome(lang) };
    case "urgency":
      return copy.askUrgency(lang);
    case "facts":
      return { text: copy.askFacts(lang) };
    default:
      return { text: copy.askFacts(lang) };
  }
}

export function applyAnswer(
  intake: Intake,
  field: keyof Intake,
  raw: string,
  buttonId?: string,
): Intake {
  const next = { ...intake };
  const value = (buttonId ?? raw).trim();
  if (field === "matterArea") {
    const key = value.toLowerCase();
    next.matterArea = AREA_MAP[key] ?? AREA_MAP[buttonId ?? ""] ?? value.slice(0, 80);
  } else if (field === "urgency") {
    next.urgency = parseUrgency(buttonId ?? raw);
  } else if (field === "clientName") {
    next.clientName = raw.trim().slice(0, 120);
  } else {
    next[field] = raw.trim().slice(0, 2000) as never;
  }
  return next;
}

function parseUrgency(text: string): Urgency {
  const t = text.toLowerCase();
  if (t.includes("high") || t.includes("alta") || t === "urgency_high") return "high";
  if (t.includes("low") || t.includes("baixa") || t.includes("baja") || t === "urgency_low") {
    return "low";
  }
  return "normal";
}

export function isOutOfScope(text: string): boolean {
  return /(matar|assassinar|bomba|ocultar evid[eê]ncia|ocultar pruebas|lavagem de dinheiro|lavado de dinero|money laundering|evadir (a )?lei|evadir impuestos de forma ilegal)/i.test(
    text,
  );
}
