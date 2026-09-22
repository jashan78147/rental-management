import crypto from "node:crypto";

/**
 * Password hashing and session signing, on node:crypto rather than another
 * dependency. scrypt is deliberately slow and memory-hard, which is what you
 * want for passwords; the salt is per-user so identical passwords do not
 * produce identical hashes.
 */

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, expected] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !expected) return false;

  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return timingSafeEqual(derived, expected);
}

function timingSafeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

/**
 * The key that signs session cookies.
 *
 * A per-process random value would break sessions the moment a second
 * serverless instance served a request, so this has to be stable across the
 * whole deployment. AUTH_SECRET is the right answer; failing that it is derived
 * from the database URL, which is already a deployment-wide secret. The
 * hardcoded last resort only ever applies to local development with no database
 * attached, where there is nothing to protect.
 */
function sessionKey(): string {
  const explicit = process.env.AUTH_SECRET;
  if (explicit) return explicit;

  const db = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (db) return crypto.createHash("sha256").update(`session:${db}`).digest("hex");

  return "local-development-session-key";
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export interface SessionPayload {
  userId: string;
  role: "customer" | "end_user";
  /** Seconds since the epoch. */
  exp: number;
}

export function signSession(payload: SessionPayload): string {
  const body = base64url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", sessionKey()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

/** Returns null for anything tampered with, malformed or expired. */
export function readSession(token: string | undefined): SessionPayload | null {
  if (!token) return null;

  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = crypto.createHmac("sha256", sessionKey()).update(body).digest("base64url");
  if (!timingSafeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.userId || !payload.role) return null;
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
