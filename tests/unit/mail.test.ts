import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mailTransport } from "@/lib/mail";

const KEYS = ["RESEND_API_KEY", "SMTP_HOST"] as const;

describe("mailTransport selection", () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("falls back to console when nothing is configured", () => {
    expect(mailTransport()).toBe("console");
  });

  it("uses SMTP when SMTP_HOST is set", () => {
    process.env.SMTP_HOST = "smtp.example.com";
    expect(mailTransport()).toBe("smtp");
  });

  it("prefers Resend when RESEND_API_KEY is set", () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.RESEND_API_KEY = "re_test";
    expect(mailTransport()).toBe("resend");
  });
});
