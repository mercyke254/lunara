import bcrypt from "bcryptjs";
import { normalizeSecurityAnswer } from "@/lib/security/normalize";
import { BCRYPT_COST } from "@/lib/auth/password";

/**
 * Security-question answer hashing.
 *
 * Split from `password.ts` because answers have different properties from
 * passwords: low entropy, human-typed, and compared only during recovery.
 *
 * Guarantees:
 *  - the plaintext answer never leaves this module
 *  - the answer is normalised (trim / lowercase / collapse spaces) BEFORE
 *    hashing, and the identical normalisation runs on verification
 *  - only the hash is persisted; the hash is never returned to a client
 */

/** Hash an answer for storage. Normalisation happens inside, not at call sites. */
export async function hashSecurityAnswer(answer: string): Promise<string> {
  const normalized = normalizeSecurityAnswer(answer);
  return bcrypt.hash(normalized, BCRYPT_COST);
}

/**
 * Verify a submitted answer against a stored hash.
 *
 * Note: the caller must NOT branch its user-facing message on the result
 * details. A wrong answer produces a generic recovery error.
 */
export async function verifySecurityAnswer(
  answer: string,
  answerHash: string,
): Promise<boolean> {
  if (!answerHash) return false;
  const normalized = normalizeSecurityAnswer(answer);
  try {
    return await bcrypt.compare(normalized, answerHash);
  } catch {
    return false;
  }
}

/**
 * Verify several answers, attempting all comparisons rather than short
 * circuiting on the first mismatch.
 *
 * Rationale: if we returned early on the first wrong answer, the response time
 * would reveal *how many* answers were correct. This version always performs
 * the full set of bcrypt comparisons and reports a single boolean.
 */
export async function verifySecurityAnswerSet(
  submissions: Array<{ answer: string; answerHash: string }>,
): Promise<boolean> {
  if (submissions.length === 0) return false;

  const results = await Promise.all(
    submissions.map(({ answer, answerHash }) =>
      verifySecurityAnswer(answer, answerHash),
    ),
  );

  return results.every(Boolean);
}
