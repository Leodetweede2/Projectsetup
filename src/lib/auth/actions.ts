"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { sendMailBestEffort } from "@/lib/mail";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit";
import { forgotPasswordSchema, loginSchema, resetPasswordSchema } from "@/lib/validation";
import {
  loginRateLimiter,
  passwordResetRateLimiter,
  formatRetryAfter,
} from "@/lib/rate-limit";
import { hashPassword, verifyPassword } from "./password";
import { createSession, destroyOtherSessions } from "./session";
import { generateToken, hashToken } from "./tokens";

export interface ActionState {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Base URL used to build verification / reset links. Prefers the APP_URL env
 * var (set this in production, e.g. https://your-app.fly.dev). When it is not
 * set, it derives the URL from the incoming request headers so links still
 * point at the real host instead of localhost.
 */
async function appUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL;
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    if (host) return `${proto}://${host}`;
  } catch {
    // headers() unavailable outside a request scope — fall through.
  }
  return "http://localhost:3000";
}
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const RESET_TTL_MS = 60 * 60 * 1000; // 1h

function fieldErrorsFrom(error: import("zod").ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}

async function issueVerificationToken(email: string, type: "EMAIL_VERIFY" | "PASSWORD_RESET") {
  const token = generateToken();
  const ttl = type === "EMAIL_VERIFY" ? VERIFY_TTL_MS : RESET_TTL_MS;
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      tokenHash: hashToken(token),
      type,
      expiresAt: new Date(Date.now() + ttl),
    },
  });
  return token;
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------
export async function registerAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  // Public self-registration is disabled: only an administrator can create
  // accounts (Admin → Users). This action stays as a safe no-op so a direct
  // POST cannot create an account.
  return {
    error: "Registration is disabled. Ask an administrator to create your account.",
  };
}

// ---------------------------------------------------------------------------
// Verify email
// ---------------------------------------------------------------------------
export async function verifyEmailByToken(
  token: string,
): Promise<{ ok: boolean; message: string }> {
  const record = await prisma.verificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!record || record.type !== "EMAIL_VERIFY" || record.expiresAt.getTime() < Date.now()) {
    return { ok: false, message: "This verification link is invalid or has expired." };
  }

  const user = await prisma.user.findUnique({ where: { email: record.identifier } });
  if (!user) return { ok: false, message: "Account not found." };

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date() },
  });
  await prisma.verificationToken.deleteMany({
    where: { identifier: record.identifier, type: "EMAIL_VERIFY" },
  });
  await logAudit({
    action: AUDIT_ACTIONS.EMAIL_VERIFIED,
    actorUserId: user.id,
    targetId: user.id,
  });

  return { ok: true, message: "Your email is verified. You can now sign in." };
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const { email, password } = parsed.data;

  // Throttle repeated attempts per account. Keying by email (not IP) avoids
  // locking out an entire site that shares one NAT egress address.
  const rlKey = email.toLowerCase();
  const limit = loginRateLimiter.check(rlKey);
  if (!limit.allowed) {
    await logAudit({
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      metadata: { email, reason: "rate_limited" },
    });
    return {
      error: `Too many sign-in attempts. Try again in ${formatRetryAfter(limit.retryAfterMs)}.`,
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  const invalid: ActionState = { error: "Invalid email or password." };
  if (!user) {
    await logAudit({ action: AUDIT_ACTIONS.LOGIN_FAILED, metadata: { email } });
    return invalid;
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    await logAudit({
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      actorUserId: user.id,
      metadata: { email },
    });
    return invalid;
  }
  if (!user.isActive) {
    return { error: "This account has been deactivated. Contact an administrator." };
  }
  if (!user.emailVerified) {
    return { error: "Please verify your email address before signing in." };
  }

  loginRateLimiter.reset(rlKey);
  await createSession(user.id);
  await logAudit({ action: AUDIT_ACTIONS.LOGIN_SUCCESS, actorUserId: user.id });

  redirect("/dashboard");
}

// ---------------------------------------------------------------------------
// Forgot password
// ---------------------------------------------------------------------------
export async function forgotPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const { email } = parsed.data;

  // Always respond the same way to avoid leaking which emails are registered,
  // including when throttled — so the limiter can't be used to probe accounts.
  const sameResponse: ActionState = {
    success: "If an account exists for that email, a password reset link has been sent.",
  };

  if (!passwordResetRateLimiter.check(email.toLowerCase()).allowed) {
    return sameResponse;
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const token = await issueVerificationToken(email, "PASSWORD_RESET");
    const link = `${await appUrl()}/reset-password?token=${token}`;
    await sendMailBestEffort({
      to: email,
      subject: "Reset your password",
      text: `Reset your password using this link:\n\n${link}\n\nThis link expires in 1 hour. If you did not request this, you can ignore this email.`,
    });
    await logAudit({
      action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
      actorUserId: user.id,
      targetId: user.id,
    });
  }

  return sameResponse;
}

// ---------------------------------------------------------------------------
// Reset password
// ---------------------------------------------------------------------------
export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const { token, password } = parsed.data;
  const record = await prisma.verificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!record || record.type !== "PASSWORD_RESET" || record.expiresAt.getTime() < Date.now()) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  const user = await prisma.user.findUnique({ where: { email: record.identifier } });
  if (!user) return { error: "Account not found." };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password) },
  });
  await prisma.verificationToken.deleteMany({
    where: { identifier: record.identifier, type: "PASSWORD_RESET" },
  });
  // Invalidate all existing sessions after a password reset.
  await destroyOtherSessions(user.id);
  await logAudit({
    action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
    actorUserId: user.id,
    targetId: user.id,
  });

  return { success: "Your password has been reset. You can now sign in." };
}
