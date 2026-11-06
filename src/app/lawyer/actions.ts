"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isValidSession, passwordMatches, SESSION_COOKIE, SESSION_TTL_SECONDS, sessionToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { allowRequest, resetRequestLimit } from "@/lib/rate-limit";

const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

async function loginRateLimitKey(): Promise<string> {
  const requestHeaders = await headers();
  // In production, the trusted reverse proxy must overwrite these forwarding headers.
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
    || requestHeaders.get("x-real-ip")?.trim()
    || "unknown";
  return `lawyer-login:${ip}`;
}

const matterUpdateSchema = z.object({
  matterId: z.string().cuid(),
  status: z.enum(["open", "reviewing", "waiting_client", "closed"]),
  lawyerNotes: z.string().trim().max(10_000),
});

const caseUpdateSchema = z.object({
  matterId: z.string().cuid(),
  title: z.string().trim().min(3).max(160),
  details: z.string().trim().min(3).max(5_000),
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

async function requireLawyerSession(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!isValidSession(token)) redirect("/lawyer/login");
}

export async function loginAction(formData: FormData): Promise<void> {
  const rateLimitKey = await loginRateLimitKey();
  if (!allowRequest(rateLimitKey, LOGIN_ATTEMPT_LIMIT, LOGIN_WINDOW_MS)) {
    redirect("/lawyer/login?error=locked");
  }

  const password = formData.get("password");
  if (typeof password !== "string" || !passwordMatches(password)) {
    redirect("/lawyer/login?error=1");
  }
  resetRequestLimit(rateLimitKey);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionToken(), {
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  redirect("/lawyer");
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/lawyer/login");
}

export async function updateMatterAction(formData: FormData): Promise<void> {
  await requireLawyerSession();
  const parsed = matterUpdateSchema.safeParse({
    matterId: formData.get("matterId"),
    status: formData.get("status"),
    lawyerNotes: formData.get("lawyerNotes") ?? "",
  });
  if (!parsed.success) redirect("/lawyer");

  const matter = await prisma.matter.update({
    where: { id: parsed.data.matterId },
    data: {
      status: parsed.data.status,
      lawyerNotes: parsed.data.lawyerNotes || null,
    },
    select: { id: true },
  });

  revalidatePath("/lawyer");
  revalidatePath(`/lawyer/cases/${matter.id}`);
  redirect(`/lawyer/cases/${matter.id}?saved=1`);
}

export async function addMatterUpdateAction(formData: FormData): Promise<void> {
  await requireLawyerSession();
  const parsed = caseUpdateSchema.safeParse({
    matterId: formData.get("matterId"),
    title: formData.get("title"),
    details: formData.get("details"),
    occurredAt: formData.get("occurredAt"),
  });
  if (!parsed.success) redirect("/lawyer");

  const occurredAt = new Date(`${parsed.data.occurredAt}T12:00:00.000Z`);
  if (Number.isNaN(occurredAt.getTime()) || occurredAt.toISOString().slice(0, 10) !== parsed.data.occurredAt) {
    redirect(`/lawyer/cases/${parsed.data.matterId}?error=update`);
  }

  const matter = await prisma.matter.findUnique({
    where: { id: parsed.data.matterId },
    select: { id: true },
  });
  if (!matter) redirect("/lawyer");

  await prisma.matterUpdate.create({
    data: {
      matterId: matter.id,
      title: parsed.data.title,
      details: parsed.data.details,
      occurredAt,
      source: "lawyer",
    },
  });

  revalidatePath("/lawyer");
  revalidatePath(`/lawyer/cases/${matter.id}`);
  redirect(`/lawyer/cases/${matter.id}?updateSaved=1`);
}
