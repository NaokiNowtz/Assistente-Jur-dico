import { config } from "../env";
import type { Outbound } from "../agent/types";

function graphUrl(path: string): string {
  return `https://graph.facebook.com/${config.whatsapp.graphVersion}/${path}`;
}

export async function sendWhatsApp(to: string, message: Outbound): Promise<void> {
  const { accessToken, phoneNumberId } = config.whatsapp;
  if (!accessToken || !phoneNumberId) return;

  const payload: Record<string, unknown> = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: message.text },
  };

  if (message.buttons?.length) {
    payload.type = "interactive";
    delete payload.text;
    payload.interactive = {
      type: "button",
      body: { text: message.text },
      action: {
        buttons: message.buttons.slice(0, 3).map((button) => ({
          type: "reply",
          reply: { id: button.id, title: button.title.slice(0, 20) },
        })),
      },
    };
  } else if (message.list) {
    payload.type = "interactive";
    delete payload.text;
    payload.interactive = {
      type: "list",
      body: { text: message.text },
      action: {
        button: message.list.button.slice(0, 20),
        sections: [
          {
            title: message.list.button.slice(0, 24),
            rows: message.list.rows.slice(0, 10).map((row) => ({
              id: row.id,
              title: row.title.slice(0, 24),
              description: row.description?.slice(0, 72),
            })),
          },
        ],
      },
    };
  }

  const response = await fetch(graphUrl(`${phoneNumberId}/messages`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`WhatsApp send failed: ${response.status} ${detail.slice(0, 200)}`);
  }
}

export async function downloadWhatsAppMedia(mediaId: string): Promise<{ bytes: Buffer; mimeType: string }> {
  const { accessToken } = config.whatsapp;
  if (!accessToken) {
    throw new Error("WHATSAPP_ACCESS_TOKEN missing");
  }
  const meta = await fetch(graphUrl(mediaId), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!meta.ok) throw new Error(`Media meta failed: ${meta.status}`);
  const json = (await meta.json()) as { url?: string; mime_type?: string };
  if (!json.url) throw new Error("Media URL missing");
  const file = await fetch(json.url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!file.ok) throw new Error(`Media download failed: ${file.status}`);
  const contentLength = Number(file.headers.get("content-length") ?? "0");
  if (contentLength > config.whatsapp.maxMediaBytes) {
    throw new Error("Media file exceeds configured size limit");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length > config.whatsapp.maxMediaBytes) {
    throw new Error("Media file exceeds configured size limit");
  }
  return { bytes, mimeType: json.mime_type ?? "application/octet-stream" };
}
