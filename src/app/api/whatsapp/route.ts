import { config } from "@/lib/env";
import { processInboundMessage } from "@/lib/agent/flow";
import { parseInboundMessages } from "@/lib/whatsapp/parse";
import { verifyWhatsAppSignature } from "@/lib/whatsapp/signature";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const verifyToken = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && verifyToken === config.whatsapp.verifyToken && challenge) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyWhatsAppSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const messages = parseInboundMessages(body);
  for (const message of messages) {
    try {
      await processInboundMessage(message);
    } catch (error) {
      // Meta expects acknowledgement quickly. One malformed event must not make it retry
      // every other valid message in this webhook batch.
      console.error("Unable to process WhatsApp message", error);
    }
  }

  return Response.json({ received: true });
}
