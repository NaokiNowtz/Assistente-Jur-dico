import type { Inbound } from "../agent/types";

type WhatsAppPayload = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          id: string;
          from: string;
          type: string;
          text?: { body?: string };
          button?: { payload?: string; text?: string };
          interactive?: {
            type?: string;
            button_reply?: { id?: string; title?: string };
            list_reply?: { id?: string; title?: string };
          };
          image?: { id?: string; mime_type?: string; caption?: string };
          document?: { id?: string; mime_type?: string; filename?: string; caption?: string };
        }>;
      };
    }>;
  }>;
};

export function parseInboundMessages(body: unknown): Inbound[] {
  const payload = body as WhatsAppPayload;
  const out: Inbound[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        const inbound: Inbound = {
          waId: message.from,
          waMessageId: message.id,
        };
        if (message.type === "text") inbound.text = message.text?.body;
        if (message.type === "button") {
          inbound.buttonId = message.button?.payload;
          inbound.text = message.button?.text;
        }
        if (message.interactive?.button_reply) {
          inbound.buttonId = message.interactive.button_reply.id;
          inbound.text = message.interactive.button_reply.title;
        }
        if (message.interactive?.list_reply) {
          inbound.buttonId = message.interactive.list_reply.id;
          inbound.text = message.interactive.list_reply.title;
        }
        if (message.image?.id) {
          inbound.media = {
            id: message.image.id,
            mimeType: message.image.mime_type ?? "image/jpeg",
            type: "image",
          };
          inbound.text = message.image.caption ?? inbound.text;
        }
        if (message.document?.id) {
          inbound.media = {
            id: message.document.id,
            mimeType: message.document.mime_type ?? "application/pdf",
            filename: message.document.filename,
            type: "document",
          };
          inbound.text = message.document.caption ?? inbound.text;
        }
        out.push(inbound);
      }
    }
  }
  return out;
}
