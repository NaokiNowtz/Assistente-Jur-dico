import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { config } from "./env";

export const SESSION_COOKIE = "lawyer_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12;

export function sessionToken(): string {
  if (!config.lawyerPassword) return "";
  const payload = `${Date.now() + SESSION_TTL_SECONDS * 1000}.${randomBytes(16).toString("hex")}`;
  const signature = createHmac("sha256", config.lawyerPassword).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function isValidSession(token: string | undefined): boolean {
  if (!token || !config.lawyerPassword) return false;
  const [expiresAt, nonce, signature, extra] = token.split(".");
  if (!expiresAt || !nonce || !signature || extra !== undefined || !/^[a-f0-9]{32}$/.test(nonce)) {
    return false;
  }
  const expiration = Number(expiresAt);
  const now = Date.now();
  if (!Number.isSafeInteger(expiration) || expiration <= now || expiration > now + SESSION_TTL_SECONDS * 1000 + 60_000) {
    return false;
  }
  const payload = `${expiresAt}.${nonce}`;
  const expected = createHmac("sha256", config.lawyerPassword).update(payload).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function passwordMatches(password: string): boolean {
  if (!config.lawyerPassword) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(config.lawyerPassword);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
