import { createHash, randomBytes } from "crypto";

/** Generate a cryptographically-random, URL-safe opaque token. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/**
 * Hash a token with SHA-256 for storage. We store hashes (never the raw token)
 * so that a database leak does not expose usable session/reset tokens.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
