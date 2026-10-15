import { createHmac, timingSafeEqual } from "crypto";
import { config } from "../env";

export function verifyWhatsAppSignature(rawBody: string, header: string | null): boolean {
  const secret = config.whatsapp.appSecret;
  // Meta always signs production webhooks. Allow an unsigned local request only to
  // make development and the verification test practical without a Meta app secret.
  if (!secret) return process.env.NODE_ENV !== "production";
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = header.slice("sha256=".length);
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
