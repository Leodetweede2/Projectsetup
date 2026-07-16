/**
 * Send a test email using the currently configured transport, to verify your
 * email setup works.
 *
 *   npm run email:test -- you@example.com
 *
 * Locally it reads .env; on Fly run it against the live app:
 *   fly ssh console -C "npm run email:test -- you@example.com"
 */
import { mailTransport, sendMail } from "../src/lib/mail";

async function main() {
  const to = process.argv[2] || process.env.SEED_ADMIN_EMAIL;
  if (!to) {
    console.error("Usage: npm run email:test -- <recipient@example.com>");
    process.exit(1);
  }

  const transport = mailTransport();
  console.log(`Sending test email to ${to} via "${transport}" transport...`);

  await sendMail({
    to,
    subject: "Test email from your app template",
    text: "If you can read this, your email configuration works. 🎉",
  });

  if (transport === "console") {
    console.log(
      "\nNo email provider is configured (RESEND_API_KEY / SMTP_HOST), so the message was only logged above.",
    );
  } else {
    console.log("Sent. Check the recipient's inbox (and spam folder).");
  }
}

main().catch((err) => {
  console.error("\nEmail test FAILED:\n", err);
  process.exit(1);
});
