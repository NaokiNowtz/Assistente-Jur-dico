import { prisma } from "../db";
import { allowRequest } from "../rate-limit";
import { downloadWhatsAppMedia } from "../whatsapp/client";
import { copy, formatIntakeSummary } from "./copy";
import { applyAnswer, isOutOfScope, nextMissingField, questionFor } from "./intake";
import { detectLanguage, isAffirmative, isNegative } from "./language";
import { reviewDocument, saveMediaFile } from "./review";
import type { Inbound, Intake, Lang, Outbound } from "./types";

type ConversationSnapshot = {
  id: string;
  language: string;
  state: string;
  consentAt: Date | null;
  intakeJson: string;
};

function readIntake(value: string): Intake {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Intake)
      : {};
  } catch {
    return {};
  }
}

function languageFor(value: string): Lang {
  return value === "es" ? "es" : "pt-BR";
}

function extensionForMime(mimeType: string): string {
  if (mimeType.includes("pdf")) return ".pdf";
  if (mimeType.includes("png")) return ".png";
  if (mimeType.includes("webp")) return ".webp";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return ".jpg";
  return ".bin";
}

async function deliver(waId: string, conversationId: string, message: Outbound): Promise<void> {
  await prisma.message.create({
    data: {
      conversationId,
      direction: "outbound",
      type: message.buttons || message.list ? "interactive" : "text",
      body: message.text,
    },
  });

  // The webhook must return 200 even when Meta is temporarily unavailable. Meta will
  // otherwise retry the inbound event, which would create a duplicate conversation step.
  try {
    const { sendWhatsApp } = await import("../whatsapp/client");
    await sendWhatsApp(waId, message);
  } catch (error) {
    console.error("Unable to send WhatsApp response", error);
  }
}

async function saveDocument(
  conversation: ConversationSnapshot,
  inbound: NonNullable<Inbound["media"]>,
  lang: Lang,
): Promise<void> {
  const media = await downloadWhatsAppMedia(inbound.id);
  const storagePath = await saveMediaFile(inbound.id, media.bytes, extensionForMime(media.mimeType));
  const result = await reviewDocument({ lang, mimeType: media.mimeType, bytes: media.bytes });

  await prisma.document.upsert({
    where: { waMediaId: inbound.id },
    create: {
      conversationId: conversation.id,
      waMediaId: inbound.id,
      mimeType: media.mimeType,
      filename: inbound.filename,
      storagePath,
      extractedText: result.text,
      reviewJson: JSON.stringify(result.review),
    },
    update: {},
  });
}

async function createMatterIfNeeded(conversation: ConversationSnapshot, intake: Intake): Promise<void> {
  const existing = await prisma.matter.findFirst({
    where: { conversationId: conversation.id, status: "open" },
    select: { id: true },
  });
  if (!existing) {
    await prisma.matter.create({
      data: {
        conversationId: conversation.id,
        intakeJson: JSON.stringify(intake),
      },
    });
  }
}

/**
 * Persists and advances one inbound WhatsApp message. The function is deliberately
 * independent of the HTTP route so it can later be reused by a queue worker.
 */
export async function processInboundMessage(inbound: Inbound): Promise<void> {
  if (inbound.waMessageId) {
    const duplicate = await prisma.message.findUnique({
      where: { waMessageId: inbound.waMessageId },
      select: { id: true },
    });
    if (duplicate) return;
  }

  let conversation = (await prisma.conversation.upsert({
    where: { waId: inbound.waId },
    create: { waId: inbound.waId },
    update: {},
    select: {
      id: true,
      language: true,
      state: true,
      consentAt: true,
      intakeJson: true,
    },
  })) as ConversationSnapshot;

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "inbound",
      type: inbound.media?.type ?? (inbound.buttonId ? "interactive" : "text"),
      body: inbound.text,
      mediaId: inbound.media?.id,
      mimeType: inbound.media?.mimeType,
      waMessageId: inbound.waMessageId,
    },
  });

  const text = inbound.text?.trim() ?? "";
  const lang = detectLanguage(text, languageFor(conversation.language));
  const intake = readIntake(conversation.intakeJson);

  if (!allowRequest(inbound.waId)) {
    await deliver(inbound.waId, conversation.id, { text: copy.rateLimited(lang) });
    return;
  }

  if (!conversation.consentAt) {
    if (conversation.state === "consent" && (inbound.buttonId === "consent_yes" || isAffirmative(text))) {
      conversation = (await prisma.conversation.update({
        where: { id: conversation.id },
        data: { consentAt: new Date(), state: "intake", language: lang },
        select: { id: true, language: true, state: true, consentAt: true, intakeJson: true },
      })) as ConversationSnapshot;
      await deliver(inbound.waId, conversation.id, questionFor("clientName", lang));
      return;
    }

    if (conversation.state === "consent" && (inbound.buttonId === "consent_no" || isNegative(text))) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { state: "greeting", language: lang },
      });
      await deliver(inbound.waId, conversation.id, { text: copy.declined(lang) });
      return;
    }

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { state: "consent", language: lang },
    });
    await deliver(inbound.waId, conversation.id, copy.welcome(lang));
    return;
  }

  if (inbound.media) {
    try {
      await saveDocument(conversation, inbound.media, lang);
    } catch (error) {
      console.error("Unable to store WhatsApp document", error);
      await deliver(inbound.waId, conversation.id, {
        text:
          lang === "es"
            ? "No pude descargar el archivo ahora. Inténtelo de nuevo o avise al despacho."
            : "Não consegui baixar o arquivo agora. Tente novamente ou avise o escritório.",
      });
      return;
    }

    const summary = formatIntakeSummary(intake, lang);
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { state: "confirm", language: lang },
    });
    await deliver(inbound.waId, conversation.id, { text: copy.receivedDoc(lang) });
    await deliver(inbound.waId, conversation.id, copy.confirm(lang, summary));
    return;
  }

  if (conversation.state === "handoff") {
    await deliver(inbound.waId, conversation.id, { text: copy.alreadyDone(lang) });
    return;
  }

  if (conversation.state === "documents") {
    if (inbound.buttonId === "docs_skip" || isNegative(text)) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { state: "confirm", language: lang },
      });
      await deliver(inbound.waId, conversation.id, copy.confirm(lang, formatIntakeSummary(intake, lang)));
      return;
    }
    await deliver(inbound.waId, conversation.id, copy.askDocuments(lang));
    return;
  }

  if (conversation.state === "confirm") {
    if (inbound.buttonId === "confirm_yes" || isAffirmative(text)) {
      await createMatterIfNeeded(conversation, intake);
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { state: "handoff", language: lang },
      });
      await deliver(inbound.waId, conversation.id, { text: copy.handedOff(lang) });
      return;
    }

    if (inbound.buttonId === "confirm_no" || isNegative(text)) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { state: "intake", language: lang, intakeJson: "{}" },
      });
      await deliver(inbound.waId, conversation.id, questionFor("clientName", lang));
      return;
    }

    await deliver(inbound.waId, conversation.id, copy.confirm(lang, formatIntakeSummary(intake, lang)));
    return;
  }

  if (isOutOfScope(text)) {
    await deliver(inbound.waId, conversation.id, { text: copy.outOfScope(lang) });
    return;
  }

  const missing = nextMissingField(intake);
  if (!missing) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { state: "documents", language: lang },
    });
    await deliver(inbound.waId, conversation.id, copy.askDocuments(lang));
    return;
  }

  const nextIntake = applyAnswer(intake, missing, text, inbound.buttonId);
  const nextMissing = nextMissingField(nextIntake);
  const nextState = nextMissing ? "intake" : "documents";
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { intakeJson: JSON.stringify(nextIntake), state: nextState, language: lang },
  });

  await deliver(
    inbound.waId,
    conversation.id,
    nextMissing ? questionFor(nextMissing, lang) : copy.askDocuments(lang),
  );
}
