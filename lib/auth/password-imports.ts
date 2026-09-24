/**
 * Convenience re-exports for scripts that run outside the Next.js bundler.
 *
 * The seed script runs under `tsx`, where importing `lib/auth/password.ts`
 * directly is fine — but having one narrow module that scripts import keeps the
 * dependency surface explicit, and makes it obvious that script code must use
 * the same hashing functions as the application (rather than, say, calling
 * bcrypt directly with a different cost factor).
 */

export {
  hashPassword,
  verifyPassword,
  checkPasswordPolicy,
  BCRYPT_COST,
} from "@/lib/auth/password";

export {
  hashSecurityAnswer,
  verifySecurityAnswer,
} from "@/lib/auth/security-answers";

export { normalizeSecurityAnswer, normalizeEmail } from "@/lib/security/normalize";
