import OpenAI from "openai";
import { config } from "../env";
import type { Intake, Lang, ReviewJson } from "./types";

function client(): OpenAI | null {
  if (!config.openai.apiKey) return null;
  return new OpenAI({ apiKey: config.openai.apiKey });
}

export async function extractIntakeWithLlm(
  lang: Lang,
  existing: Intake,
  userText: string,
): Promise<Partial<Intake> | null> {
  const openai = client();
  if (!openai) return null;
  const response = await openai.chat.completions.create({
    model: config.openai.model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          lang === "es"
            ? "Extrae campos de intake jurídico. No des consejos legales. JSON con clientName, matterArea, opposingParty, timeline, desiredOutcome, urgency (low|normal|high), facts. Omite vacíos."
            : "Extraia campos de intake jurídico. Não dê conselhos legais. JSON com clientName, matterArea, opposingParty, timeline, desiredOutcome, urgency (low|normal|high), facts. Omita vazios.",
      },
      {
        role: "user",
        content: JSON.stringify({ existing, userText }),
      },
    ],
  });
  const raw = response.choices[0]?.message?.content;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Partial<Intake>;
  } catch {
    return null;
  }
}

export async function reviewWithLlm(
  lang: Lang,
  text: string,
): Promise<ReviewJson | null> {
  const openai = client();
  if (!openai) return null;
  const snippet = text.slice(0, 12000);
  const response = await openai.chat.completions.create({
    model: config.openai.model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You assist a lawyer. Return JSON: documentTypeGuess, keyClauses[], missingItems[], redFlags[], questionsForLawyer[], clientSafeRecap. clientSafeRecap must NOT predict case outcomes or cite statutes as advice. Language of recap: " +
          lang,
      },
      { role: "user", content: snippet },
    ],
  });
  const raw = response.choices[0]?.message?.content;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ReviewJson;
  } catch {
    return null;
  }
}

export async function describeImageWithLlm(lang: Lang, dataUrl: string): Promise<string | null> {
  const openai = client();
  if (!openai) return null;
  const response = await openai.chat.completions.create({
    model: config.openai.model,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              lang === "es"
                ? "Describe el documento de la imagen para un abogado. No des consejos legales."
                : "Descreva o documento da imagem para um advogado. Não dê conselhos legais.",
          },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  });
  return response.choices[0]?.message?.content ?? null;
}
