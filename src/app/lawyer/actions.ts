"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isValidSession, passwordMatches, SESSION_COOKIE, SESSION_TTL_SECONDS, sessionToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

const matterUpdateSchema = z.object({
  matterId: z.string().cuid(),
  status: z.enum(["open", "reviewing", "waiting_client", "closed"]),
  lawyerNotes: z.string().trim().max(10_000),
});

async function requireLawyerSession(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!isValidSession(token)) redirect("/lawyer/login");
}

export async function loginAction(formData: FormData): Promise<void> {
  const password = formData.get("password");
  if (typeof password !== "string" || !passwordMatches(password)) {
    redirect("/lawyer/login?error=1");
  }

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
