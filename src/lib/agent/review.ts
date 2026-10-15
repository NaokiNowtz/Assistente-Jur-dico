import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { describeImageWithLlm, reviewWithLlm } from "./llm";
import type { Lang, ReviewJson } from "./types";

const MEDIA_DIR = path.join(process.cwd(), "data", "media");

export async function saveMediaFile(id: string, bytes: Buffer, ext: string): Promise<string> {
  await mkdir(MEDIA_DIR, { recursive: true });
  const storagePath = path.join(MEDIA_DIR, `${id}${ext}`);
  await writeFile(storagePath, bytes);
  return storagePath;
}

export async function extractPdfText(bytes: Buffer): Promise<string> {
  const mod = (await import("pdf-parse")) as unknown as {
    default?: (buf: Buffer) => Promise<{ text: string }>;
    PDFParse?: new (opts: { data: Buffer }) => { getText: () => Promise<{ text: string }> };
  };
  if (typeof mod.default === "function") {
    const parsed = await mod.default(bytes);
    return parsed.text ?? "";
  }
  if (mod.PDFParse) {
    const parser = new mod.PDFParse({ data: bytes });
    const parsed = await parser.getText();
    return parsed.text ?? "";
  }
  return "";
}

export async function heuristicReview(lang: Lang, text: string): Promise<ReviewJson> {
  const lower = text.toLowerCase();
  const redFlags: string[] = [];
  if (/cl[áa]usula penal|multa|penalty/.test(lower)) redFlags.push("penalty_clause");
  if (/confiden/.test(lower)) redFlags.push("confidentiality");
  if (/foro|jurisdi[cç]/.test(lower)) redFlags.push("forum_clause");
  if (!text.trim()) redFlags.push("empty_or_unreadable");

  const clientSafeRecap =
    lang === "es"
      ? "Recibimos el archivo. Un abogado revisará el contenido. Esto no es un dictamen ni una predicción del caso."
      : "Recebemos o arquivo. Um advogado revisará o conteúdo. Isto não é um parecer nem uma previsão do caso.";

  return {
    documentTypeGuess: guessType(lower),
    keyClauses: [],
    missingItems: text.trim() ? [] : ["text_extraction_failed"],
    redFlags,
    questionsForLawyer: ["Confirm document authenticity and parties."],
    clientSafeRecap,
  };
}

function guessType(lower: string): string {
  if (/peti[cç][aã]o|demanda/.test(lower)) return "petition";
  if (/contrato|contract/.test(lower)) return "contract";
  if (/procura[cç][aã]o/.test(lower)) return "power_of_attorney";
  return "unknown";
}

export async function reviewDocument(options: {
  lang: Lang;
  mimeType: string;
  bytes: Buffer;
}): Promise<{ text: string; review: ReviewJson }> {
  const { lang, mimeType, bytes } = options;
  let text = "";
  if (mimeType.includes("pdf")) {
    try {
      text = await extractPdfText(bytes);
    } catch {
      text = "";
    }
  } else if (mimeType.startsWith("image/")) {
    const dataUrl = `data:${mimeType};base64,${bytes.toString("base64")}`;
    text = (await describeImageWithLlm(lang, dataUrl)) ?? "";
  } else {
    text = bytes.toString("utf8").slice(0, 8000);
  }

  const llm = text.trim() ? await reviewWithLlm(lang, text) : null;
  const review = llm ?? (await heuristicReview(lang, text));
  if (!text.trim() && mimeType.startsWith("image/") && !process.env.OPENAI_API_KEY) {
    review.missingItems = [...review.missingItems, "ocr_requires_openai_key"];
    review.clientSafeRecap =
      lang === "es"
        ? "Recibimos la imagen. La lectura automática de fotos requiere configuración del modelo; un abogado la verá igual."
        : "Recebemos a imagem. A leitura automática de fotos exige configuração do modelo; um advogado verá mesmo assim.";
  }
  return { text, review };
}
