import bcrypt from "bcryptjs";

/**
 * Password and security-answer hashing.
 *
 * Algorithm: bcrypt (cost 12). The brief allows Argon2id or bcrypt; bcrypt is
 * chosen because it needs no native toolchain, which keeps builds and
 * serverless cold starts portable. Cost 12 is ~250-400ms per hash on modern
 * hardware - deliberately slow enough to make offline guessing expensive.
 *
 * NEVER store or log the plaintext. Callers receive a hash and nothing else.
 */

/** Minimum length, per the requirements. */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * bcrypt only consumes the first 72 **bytes** of input and silently ignores the
 * rest. Rather than let a long passphrase be silently truncated (two different
 * long passwords could then authenticate the same account), we reject anything
 * beyond the limit and say so. The Zod schema enforces the same bound.
 */
export const PASSWORD_MAX_LENGTH = 72;

/** bcrypt cost factor. Raising this invalidates nothing - hashes self-describe. */
export const BCRYPT_COST = 12;

export interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
}

/**
 * Password policy:
 *   - at least 8 characters
 *   - at least one uppercase letter
 *   - at least one lowercase letter
 *   - at least one number
 *   - at most 72 bytes (bcrypt's effective input limit)
 */
export function checkPasswordPolicy(password: string): PasswordPolicyResult {
  const errors: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Use at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
  if (Buffer.byteLength(password, "utf8") > PASSWORD_MAX_LENGTH) {
    errors.push(`Use at most ${PASSWORD_MAX_LENGTH} characters.`);
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Add at least one uppercase letter.");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Add at least one lowercase letter.");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Add at least one number.");
  }

  return { valid: errors.length === 0, errors };
}

/** Hash a plaintext password. Returns a self-describing bcrypt hash. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

/**
 * Verify a password against a stored hash.
 * `compare` is constant-time with respect to the hash contents. Malformed or
 * empty hashes resolve to `false` rather than throwing.
 */
export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  if (!passwordHash) return false;
  try {
    return await bcrypt.compare(password, passwordHash);
  } catch {
    return false;
  }
}

/**
 * A throwaway hash used to equalise response timing when an email does not
 * exist. Without this, "unknown email" returns measurably faster than "wrong
 * password", which leaks account existence. Computed once per process.
 */
let timingEqualizerHash: string | null = null;

export async function getTimingEqualizerHash(): Promise<string> {
  if (!timingEqualizerHash) {
    timingEqualizerHash = await bcrypt.hash(
      "lunara::timing-equalizer::not-a-real-password",
      BCRYPT_COST,
    );
  }
  return timingEqualizerHash;
}

/** Burn roughly the same CPU as a real password check. */
export async function wastePasswordComparison(): Promise<void> {
  await verifyPassword("lunara::timing-equalizer", await getTimingEqualizerHash());
}
