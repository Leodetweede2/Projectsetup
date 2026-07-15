import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db";
import { generateToken, hashToken } from "./tokens";
import { SESSION_COOKIE, SESSION_TTL_DAYS } from "./constants";

export { SESSION_COOKIE };

function expiryDate(): Date {
  return new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Create a new DB-backed session for a user and set the session cookie.
 * Returns the raw token (only useful for tests).
 */
export async function createSession(userId: string): Promise<string> {
  const token = generateToken();
  const tokenHash = hashToken(token);

  const hdrs = await headers();
  await prisma.session.create({
    data: {
      tokenHash,
      userId,
      expiresAt: expiryDate(),
      userAgent: hdrs.get("user-agent") ?? undefined,
      ip: hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiryDate(),
  });

  return token;
}

/** Look up the session row for the current request's cookie, if valid. */
export async function getSessionFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return session;
}

/** Destroy the current session (DB row + cookie). */
export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session
      .deleteMany({ where: { tokenHash: hashToken(token) } })
      .catch(() => {});
  }
  cookieStore.delete(SESSION_COOKIE);
}

/** Delete all sessions for a user except an optional one to keep (e.g. current). */
export async function destroyOtherSessions(userId: string, keepTokenHash?: string): Promise<void> {
  await prisma.session.deleteMany({
    where: {
      userId,
      ...(keepTokenHash ? { NOT: { tokenHash: keepTokenHash } } : {}),
    },
  });
}
