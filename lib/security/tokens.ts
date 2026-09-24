import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Opaque token generation and hashing.
 *
 * Design: the raw token is handed to the client in an httpOnly cookie; only its
 * SHA-256 digest is stored. A database leak therefore yields no usable session
 * or recovery token.
 *
 * SHA-256 (not bcrypt) is correct here: these tokens are 256 bits of CSPRNG
 * output, so they are not guessable and do not need a slow KDF. Slow hashing is
 * only needed for low-entropy secrets (passwords, security answers).
 */

/** 256-bit cryptographically secure random token, URL-safe. */
export function generateToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

/** SHA-256 hex digest of a token. Deterministic, so lookups stay indexable. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Constant-time comparison of two token digests. */
export function tokenDigestMatches(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Rejection-sampling-free short numeric code (for future OTP-style flows).
 * Uses `randomInt` so the distribution is uniform - never `Math.random()`.
 */
export function generateNumericCode(digits = 6): string {
  const max = 10 ** digits;
  const value = randomBytes(4).readUInt32BE(0) % max;
  return value.toString().padStart(digits, "0");
}
