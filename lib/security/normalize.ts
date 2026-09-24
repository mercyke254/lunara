import { timingSafeEqual } from "node:crypto";

/**
 * Input normalisation for secrets that must be compared, not stored:
 * security-question answers and account identifiers.
 *
 * Normalisation is what makes security answers usable: a user who typed
 * "  Springfield  Elementary " at signup must be able to recover with
 * "springfield elementary". Normalisation happens BEFORE hashing, and the same
 * function is applied on verification, so the two always agree.
 */

/**
 * Normalise a security-question answer.
 *
 * Steps (per the security requirements):
 *   1. trim leading/trailing whitespace
 *   2. convert to lowercase
 *   3. collapse internal runs of whitespace to a single space
 *
 * NFKC is applied first so that visually identical Unicode forms (full-width
 * characters, ligatures, composed accents) normalise identically instead of
 * producing a surprising mismatch.
 *
 * The returned value is ONLY ever passed to a hash function. It is never
 * persisted, returned, or logged.
 */
export function normalizeSecurityAnswer(raw: string): string {
  return raw
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Normalise an email for storage and lookup.
 * Stored lower-cased so that `User.email` uniqueness is case-insensitive.
 */
export function normalizeEmail(raw: string): string {
  return raw.normalize("NFKC").trim().toLowerCase();
}

/** Collapse whitespace and trim - used for names, labels, and free text. */
export function collapseWhitespace(raw: string): string {
  return raw.normalize("NFKC").trim().replace(/\s+/g, " ");
}

/**
 * Strip control characters from user-supplied text before it is persisted.
 *
 * This is defence in depth, not a substitute for output escaping: React already
 * escapes rendered text, and Prisma parameterises SQL. The purpose here is to
 * reject invisible/control noise (including bidi override characters that can
 * spoof displayed text) rather than to sanitise HTML.
 */
export function sanitizeText(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .trim();
}

/** Normalise a display name: collapse whitespace plus control-char stripping. */
export function normalizeDisplayName(raw: string): string {
  return collapseWhitespace(sanitizeText(raw)).slice(0, 100);
}

/** Multi-line notes: keep newlines, drop control noise, cap length. */
export function sanitizeMultiline(raw: string, maxLength = 2000): string {
  const cleaned = raw
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
  return cleaned.slice(0, maxLength);
}

/**
 * Constant-time string comparison for secrets.
 *
 * Note: this module is ESM (`"type": "module"`), so `node:crypto` is imported
 * statically rather than via `require`.
 */
export function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
