import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join, extname } from "path";
import { randomUUID } from "crypto";

/**
 * Small storage abstraction for floor-plan images.
 *
 * Two drivers, auto-selected:
 *   - "supabase": Supabase Storage (production). Set SUPABASE_URL +
 *     SUPABASE_SERVICE_ROLE_KEY (+ optional SUPABASE_STORAGE_BUCKET). Objects are
 *     served via short-lived signed URLs.
 *   - "local": local filesystem under LOCAL_STORAGE_DIR (default ".storage").
 *     Used for development/tests when Supabase env vars are absent.
 *
 * Images are always served through GET /api/floorplans/[id]/image, which either
 * redirects to a signed URL (supabase) or streams the bytes (local).
 */

export type StorageDriver = "supabase" | "local";

export function storageDriver(): StorageDriver {
  return process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? "supabase"
    : "local";
}

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "floorplans";
const LOCAL_DIR = process.env.LOCAL_STORAGE_DIR || ".storage";
const SIGNED_URL_TTL_SECONDS = 600;

/** Generate a unique storage key for an uploaded image. */
export function newImageKey(ext = ".png"): string {
  return `floorplans/${randomUUID()}${ext}`;
}

export function contentTypeFor(key: string): string {
  switch (extname(key).toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

// --- Supabase driver -------------------------------------------------------

async function supabaseClient() {
  const { createClient } = await import("@supabase/supabase-js");
  // Trim to defend against stray whitespace / newlines in the secret value.
  const url = (process.env.SUPABASE_URL ?? "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Add actionable guidance to common Supabase auth/key errors. */
function withKeyHint(message: string): string {
  if (/jws|jwt|invalid.*(header|signature|token)|invalid api key|unauthorized/i.test(message)) {
    return (
      `${message} — check SUPABASE_SERVICE_ROLE_KEY. It must be the project's ` +
      `**service_role** key: a JWT that starts with "eyJ" (Project Settings → API → ` +
      `Project API keys → service_role). Do not use the anon / publishable key or a ` +
      `new-style "sb_secret_…" key, and make sure the value has no quotes or line breaks.`
    );
  }
  return message;
}


// --- Public API ------------------------------------------------------------

/** Store bytes under a key. */
export async function putObject(
  key: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<void> {
  if (storageDriver() === "supabase") {
    const client = await supabaseClient();
    const upload = () =>
      client.storage.from(BUCKET).upload(key, bytes, { contentType, upsert: true });

    let { error } = await upload();
    // Auto-create the (private) bucket the first time if it does not exist yet.
    if (error && /bucket not found|not found/i.test(error.message)) {
      const { error: createError } = await client.storage.createBucket(BUCKET, {
        public: false,
      });
      if (createError && !/already exists/i.test(createError.message)) {
        throw new Error(
          `Could not create Supabase bucket "${BUCKET}": ${withKeyHint(createError.message)}`,
        );
      }
      ({ error } = await upload());
    }
    if (error) throw new Error(`Supabase upload failed: ${withKeyHint(error.message)}`);
    return;
  }

  const path = join(process.cwd(), LOCAL_DIR, key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);
}

/**
 * For the "supabase" driver, return a short-lived signed URL to redirect to.
 * For the "local" driver, return null (the caller should stream via getObject).
 */
export async function getSignedUrl(key: string): Promise<string | null> {
  if (storageDriver() !== "supabase") return null;
  const client = await supabaseClient();
  const { data, error } = await client.storage
    .from(BUCKET)
    .createSignedUrl(key, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    throw new Error(`Supabase signed URL failed: ${withKeyHint(error?.message ?? "unknown error")}`);
  }
  return data.signedUrl;
}

/** Read raw bytes for the local driver (used by the image-serving route). */
export async function getObject(
  key: string,
): Promise<{ bytes: Buffer; contentType: string } | null> {
  try {
    const bytes = await readFile(join(process.cwd(), LOCAL_DIR, key));
    return { bytes, contentType: contentTypeFor(key) };
  } catch {
    return null;
  }
}
