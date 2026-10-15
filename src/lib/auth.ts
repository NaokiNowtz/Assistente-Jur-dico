import { createHmac, timingSafeEqual } from "crypto";
import { config } from "./env";

export const SESSION_COOKIE = "lawyer_session";

export function sessionToken(): string {
  return createHmac("sha256", config.lawyerPassword).update("lawyer-inbox").digest("hex");
}

export function isValidSession(token: string | undefined): boolean {
  if (!token) return false;
  const expected = sessionToken();
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function passwordMatches(password: string): boolean {
  const a = Buffer.from(password);
  const b = Buffer.from(config.lawyerPassword);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
