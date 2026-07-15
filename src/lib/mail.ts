import nodemailer from "nodemailer";

interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

/**
 * Send an email. If SMTP is not configured (no SMTP_HOST), the message is
 * logged to the server console instead so the template works with zero setup.
 */
export async function sendMail({ to, subject, text, html }: SendMailOptions): Promise<void> {
  if (!isSmtpConfigured()) {
    console.log(
      [
        "",
        "──────────────────────────────────────────────",
        "📧  Email (SMTP not configured — logging instead)",
        `    To:      ${to}`,
        `    Subject: ${subject}`,
        "",
        text,
        "──────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM ?? "No Reply <no-reply@example.com>",
    to,
    subject,
    text,
    html: html ?? `<pre>${text}</pre>`,
  });
}
