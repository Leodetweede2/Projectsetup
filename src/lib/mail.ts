import nodemailer from "nodemailer";

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export type MailTransport = "resend" | "smtp" | "console";

/**
 * Decide how email is sent, based on which env vars are configured:
 *   1. RESEND_API_KEY  -> Resend HTTP API (simplest; just an API key)
 *   2. SMTP_HOST       -> SMTP via nodemailer (Office 365, Gmail, Postmark, ...)
 *   3. otherwise       -> log to the server console (zero-config dev fallback)
 */
export function mailTransport(): MailTransport {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SMTP_HOST) return "smtp";
  return "console";
}

function mailFrom(): string {
  return process.env.MAIL_FROM ?? "No Reply <onboarding@resend.dev>";
}

function toHtml(text: string, html?: string): string {
  return html ?? `<pre style="font-family:inherit;white-space:pre-wrap">${text}</pre>`;
}

async function sendViaResend({ to, subject, text, html }: SendMailOptions): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: mailFrom(), to, subject, text, html: toHtml(text, html) }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend API error ${res.status}: ${detail}`);
  }
}

async function sendViaSmtp({ to, subject, text, html }: SendMailOptions): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    // true for port 465 (implicit TLS); false for 587/25 (STARTTLS).
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });

  await transporter.sendMail({
    from: mailFrom(),
    to,
    subject,
    text,
    html: toHtml(text, html),
  });
}

function logToConsole({ to, subject, text }: SendMailOptions): void {
  console.log(
    [
      "",
      "──────────────────────────────────────────────",
      "📧  Email (no provider configured — logging instead)",
      `    To:      ${to}`,
      `    Subject: ${subject}`,
      "",
      text,
      "──────────────────────────────────────────────",
      "",
    ].join("\n"),
  );
}

/**
 * Send an email via the configured transport. Throws if a configured provider
 * (Resend/SMTP) fails, so callers that care (e.g. the email:test script) can
 * surface the error. In user-facing flows, wrap the call so a delivery failure
 * does not break the primary action.
 */
export async function sendMail(options: SendMailOptions): Promise<void> {
  switch (mailTransport()) {
    case "resend":
      return sendViaResend(options);
    case "smtp":
      return sendViaSmtp(options);
    default:
      return logToConsole(options);
  }
}

/**
 * Best-effort variant for user-facing flows: sends the email but never throws,
 * so a delivery failure does not break the primary action (e.g. registration).
 * Returns whether the email was sent successfully.
 */
export async function sendMailBestEffort(options: SendMailOptions): Promise<boolean> {
  try {
    await sendMail(options);
    return true;
  } catch (err) {
    console.error(`Failed to send email to ${options.to} ("${options.subject}"):`, err);
    return false;
  }
}
