import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { generateToken, hashToken } from "@/lib/security/tokens";
import { normalizeEmail } from "@/lib/security/normalize";
import { hashIpFromHeaders } from "@/lib/security/ip";
import { verifySecurityAnswerSet } from "@/lib/auth/security-answers";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { invalidateAllSessions } from "@/lib/auth/session";
import { recordAuditEvent } from "@/lib/security/audit";
import {
  RATE_LIMITS,
  pruneExpiredRateLimits,
  rateLimit,
  rateLimitKeys,
  resetRateLimit,
} from "@/lib/security/rate-limit";
import { REQUIRED_SECURITY_QUESTION_COUNT } from "@/lib/constants";

/**
 * ============================================================================
 *  Security-question account recovery
 * ============================================================================
 *
 * FLOW
 *   1. user submits an email
 *   2. we ALWAYS advance to the questions step (see "enumeration" below)
 *   3. user answers the three questions they chose at sign-up
 *   4. on success the session is marked verified and the token is ROTATED
 *   5. user sets a new password; all existing sessions are invalidated
 *
 * ACCOUNT ENUMERATION
 * The single most important property here is that an attacker cannot tell
 * whether an email is registered. So:
 *   - the start step returns the same payload and the same message regardless
 *   - for an unknown email we return a set of DECOY questions drawn from the
 *     public catalogue, and set a cookie that matches no database row, so the
 *     verify step fails exactly as a wrong answer would
 *   - every user-facing failure message is identical
 *
 * SECRETS
 *   - answers are normalised and bcrypt-compared; plaintext never persists
 *   - the raw token lives only in an httpOnly cookie; the database stores its
 *     SHA-256 digest
 *   - answers are never placed in a URL, never logged, and never returned
 */

/** Cookie holding the raw recovery token. HttpOnly, so JS cannot read it. */
export const RECOVERY_COOKIE_NAME = "lunara_recovery";

/** A recovery attempt must be completed within this window. */
export const RECOVERY_SESSION_TTL_MINUTES = 20;

/** Wrong answers allowed before the session is locked out. */
export const RECOVERY_MAX_ATTEMPTS = 5;

/** Shown for EVERY recovery failure. Never more specific than this. */
export const GENERIC_RECOVERY_ERROR =
  "Your recovery information could not be verified.";

/** Shown after step 2, whatever the outcome. */
export const GENERIC_RECOVERY_START_MESSAGE =
  "If an account exists with this email, you can continue with account recovery.";

/** Shown when the recovery session itself is missing/expired/locked. */
export const RECOVERY_SESSION_ERROR =
  "This recovery session has expired. Please start again.";

export interface RecoveryQuestion {
  /** Opaque id of the question. Safe to expose - it identifies the question, not the answer. */
  questionId: string;
  question: string;
}

export type StartRecoveryResult = {
  ok: true;
  message: string;
  questions: RecoveryQuestion[];
};

export type VerifyRecoveryResult =
  | { ok: true }
  | { ok: false; error: string; lockedOut: boolean };

export type CompleteRecoveryResult =
  | { ok: true }
  | { ok: false; error: string };

function recoveryCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
    maxAge: RECOVERY_SESSION_TTL_MINUTES * 60,
  };
}

async function setRecoveryCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set(RECOVERY_COOKIE_NAME, token, recoveryCookieOptions(expiresAt));
}

export async function clearRecoveryCookie(): Promise<void> {
  const store = await cookies();
  store.set(RECOVERY_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

async function readRecoveryToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(RECOVERY_COOKIE_NAME)?.value ?? null;
}

/**
 * The first N active questions, used both for the legitimate "choose your
 * questions" step and as the decoy set for unknown emails.
 */
async function loadCatalogueQuestions(limit: number): Promise<RecoveryQuestion[]> {
  const questions = await prisma.securityQuestion.findMany({
    where: { active: true },
    orderBy: { question: "asc" },
    take: limit,
    select: { id: true, question: true },
  });
  return questions.map((q) => ({ questionId: q.id, question: q.question }));
}

/**
 * STEP 2 - begin recovery for an email address.
 *
 * Returns the same shape and message whether or not the account exists.
 */
export async function startRecovery(
  email: string,
  headers: Headers,
): Promise<StartRecoveryResult> {
  const ipHash = hashIpFromHeaders(headers);

  // Rate limit by IP first: cheap, and stops bulk probing of many addresses.
  const ipLimit = await rateLimit({
    key: rateLimitKeys.recoveryRequestByIp(ipHash),
    ...RATE_LIMITS.recoveryRequestByIp,
  });
  if (!ipLimit.ok) {
    // Deliberately identical to the success path so a throttled attacker learns
    // nothing about the address either.
    return {
      ok: true,
      message: GENERIC_RECOVERY_START_MESSAGE,
      questions: await loadCatalogueQuestions(REQUIRED_SECURITY_QUESTION_COUNT),
    };
  }

  // Opportunistic housekeeping; no scheduler needed.
  void pruneExpiredRateLimits();

  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
    select: { id: true, deletedAt: true },
  });

  // ---- Unknown / deleted account: decoy path -----------------------------
  if (!user || user.deletedAt) {
    const decoys = await loadCatalogueQuestions(REQUIRED_SECURITY_QUESTION_COUNT);
    // A cookie that matches no row: the verify step will fail generically.
    const decoyExpiry = new Date(Date.now() + RECOVERY_SESSION_TTL_MINUTES * 60 * 1000);
    await setRecoveryCookie(generateToken(32), decoyExpiry);
    return { ok: true, message: GENERIC_RECOVERY_START_MESSAGE, questions: decoys };
  }

  // Rate limit per account as well, so one address cannot be hammered.
  const accountLimit = await rateLimit({
    key: rateLimitKeys.recoveryRequestByAccount(user.id),
    ...RATE_LIMITS.recoveryRequestByAccount,
  });
  if (!accountLimit.ok) {
    return {
      ok: true,
      message: GENERIC_RECOVERY_START_MESSAGE,
      questions: await loadCatalogueQuestions(REQUIRED_SECURITY_QUESTION_COUNT),
    };
  }

  // Invalidate any earlier in-flight recovery sessions for this user.
  await prisma.passwordRecoverySession.deleteMany({
    where: { userId: user.id, consumedAt: null },
  });

  const token = generateToken(32);
  const expiresAt = new Date(Date.now() + RECOVERY_SESSION_TTL_MINUTES * 60 * 1000);

  await prisma.passwordRecoverySession.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt,
      attempts: 0,
      maxAttempts: RECOVERY_MAX_ATTEMPTS,
      ipHash,
    },
  });

  await setRecoveryCookie(token, expiresAt);

  await recordAuditEvent({
    userId: user.id,
    event: "PASSWORD_RESET_REQUESTED",
    ipHash,
    userAgent: headers.get("user-agent"),
  });

  // Only the questions the user actually selected are returned.
  const answers = await prisma.userSecurityAnswer.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: { questionId: true, question: { select: { question: true } } },
  });

  const questions: RecoveryQuestion[] = answers.map((a) => ({
    questionId: a.questionId,
    question: a.question.question,
  }));

  // Defensive: an account without three answers cannot use this flow. Return
  // catalogue decoys so the response shape stays identical.
  if (questions.length < REQUIRED_SECURITY_QUESTION_COUNT) {
    return {
      ok: true,
      message: GENERIC_RECOVERY_START_MESSAGE,
      questions: await loadCatalogueQuestions(REQUIRED_SECURITY_QUESTION_COUNT),
    };
  }

  return { ok: true, message: GENERIC_RECOVERY_START_MESSAGE, questions };
}

/**
 * Resolve and validate the recovery session behind the cookie.
 * Also enforces the per-session attempt ceiling.
 */
async function loadActiveRecoverySession() {
  const token = await readRecoveryToken();
  if (!token) return { status: "missing" as const };

  const session = await prisma.passwordRecoverySession.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      userId: true,
      attempts: true,
      maxAttempts: true,
      expiresAt: true,
      verifiedAt: true,
      consumedAt: true,
    },
  });

  if (!session) return { status: "missing" as const };
  if (session.consumedAt) return { status: "missing" as const };
  if (session.expiresAt.getTime() <= Date.now()) return { status: "expired" as const };
  if (session.attempts >= session.maxAttempts) return { status: "locked" as const, session };

  return { status: "active" as const, session };
}

/**
 * STEP 3 - verify the three answers.
 *
 * On success the token is ROTATED: the pre-verification token is replaced by a
 * fresh one, so a token captured before verification cannot be used to set a
 * password.
 */
export async function verifyRecoveryAnswers(
  submissions: Array<{ questionId: string; answer: string }>,
  headers: Headers,
): Promise<VerifyRecoveryResult> {
  const ipHash = hashIpFromHeaders(headers);
  const resolved = await loadActiveRecoverySession();

  if (resolved.status === "expired" || resolved.status === "locked") {
    return { ok: false, error: RECOVERY_SESSION_ERROR, lockedOut: true };
  }

  if (resolved.status === "missing") {
    // Covers the decoy cookie used for unknown emails: indistinguishable from a
    // wrong answer, which is exactly the point.
    await recordAuditEvent({
      event: "RECOVERY_VERIFICATION_FAILED",
      ipHash,
      userAgent: headers.get("user-agent"),
      metadata: { reason: "no_active_session" },
    });
    return { ok: false, error: GENERIC_RECOVERY_ERROR, lockedOut: false };
  }

  const { session } = resolved;

  // Per-session throttle, in addition to the row's own attempt counter.
  const sessionLimit = await rateLimit({
    key: rateLimitKeys.recoveryVerifyBySession(session.id),
    ...RATE_LIMITS.recoveryVerifyBySession,
  });

  // Always read the stored hashes for the SUBMITTED question ids, scoped to the
  // session's user. A questionId belonging to someone else simply will not be
  // found, and so cannot be answered.
  const stored = await prisma.userSecurityAnswer.findMany({
    where: {
      userId: session.userId,
      questionId: { in: submissions.map((s) => s.questionId) },
    },
    select: { questionId: true, answerHash: true },
  });

  const byQuestionId = new Map(stored.map((s) => [s.questionId, s.answerHash]));

  // Missing rows are treated as wrong answers rather than an error, so the
  // response cannot be used to probe which questions an account has.
  const comparisons = submissions.map((s) => ({
    answer: s.answer,
    answerHash: byQuestionId.get(s.questionId) ?? "",
  }));

  const verified =
    stored.length >= REQUIRED_SECURITY_QUESTION_COUNT &&
    sessionLimit.ok &&
    (await verifySecurityAnswerSet(comparisons));

  if (!verified) {
    const updated = await prisma.passwordRecoverySession.update({
      where: { id: session.id },
      data: { attempts: { increment: 1 } },
      select: { attempts: true, maxAttempts: true, userId: true },
    });

    const lockedOut = updated.attempts >= updated.maxAttempts;

    await recordAuditEvent({
      userId: updated.userId,
      event: lockedOut ? "RECOVERY_LOCKED" : "RECOVERY_VERIFICATION_FAILED",
      ipHash,
      userAgent: headers.get("user-agent"),
      metadata: { attempts: updated.attempts, maxAttempts: updated.maxAttempts },
    });

    if (lockedOut) {
      // Burn the session so even a correct answer cannot continue.
      await prisma.passwordRecoverySession.update({
        where: { id: session.id },
        data: { consumedAt: new Date() },
      });
      return { ok: false, error: RECOVERY_SESSION_ERROR, lockedOut: true };
    }

    return { ok: false, error: GENERIC_RECOVERY_ERROR, lockedOut: false };
  }

  // ---- Success: rotate the token, mark verified --------------------------
  const newToken = generateToken(32);
  await prisma.passwordRecoverySession.update({
    where: { id: session.id },
    data: {
      verifiedAt: new Date(),
      tokenHash: hashToken(newToken),
      // Reset the counter: the verified phase gets its own budget.
      attempts: 0,
      maxAttempts: RECOVERY_MAX_ATTEMPTS,
    },
  });

  await setRecoveryCookie(newToken, session.expiresAt);
  await resetRateLimit(rateLimitKeys.recoveryVerifyBySession(session.id));

  return { ok: true };
}

/**
 * STEP 5 - set the new password.
 *
 * Requires a session that has passed verification. Invalidates every existing
 * session and requires the user to sign in again with the new credentials.
 */
export async function completeRecoveryReset(
  newPassword: string,
  headers: Headers,
): Promise<CompleteRecoveryResult> {
  const ipHash = hashIpFromHeaders(headers);

  const ipLimit = await rateLimit({
    key: rateLimitKeys.passwordResetByIp(ipHash),
    ...RATE_LIMITS.passwordResetByIp,
  });
  if (!ipLimit.ok) {
    return { ok: false, error: GENERIC_RECOVERY_ERROR };
  }

  const resolved = await loadActiveRecoverySession();

  if (resolved.status !== "active") {
    return { ok: false, error: RECOVERY_SESSION_ERROR };
  }

  const { session } = resolved;

  // The gate: verification must have happened in this session.
  if (!session.verifiedAt) {
    await recordAuditEvent({
      userId: session.userId,
      event: "RECOVERY_VERIFICATION_FAILED",
      ipHash,
      userAgent: headers.get("user-agent"),
      metadata: { reason: "reset_without_verification" },
    });
    return { ok: false, error: GENERIC_RECOVERY_ERROR };
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.userId },
      data: {
        passwordHash,
        // Records the reset timestamp and invalidates pre-reset sessions.
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    }),
    prisma.passwordRecoverySession.update({
      where: { id: session.id },
      data: { consumedAt: new Date() },
    }),
  ]);

  // "Invalidate existing sessions" + "require the user to sign in again".
  await invalidateAllSessions(session.userId);
  await clearRecoveryCookie();

  await recordAuditEvent({
    userId: session.userId,
    event: "PASSWORD_RESET_COMPLETED",
    ipHash,
    userAgent: headers.get("user-agent"),
  });

  return { ok: true };
}

/**
 * Current state of the cookie-backed recovery session, used by the
 * /reset-password page to decide whether to render the form or an error.
 */
export async function getRecoverySessionState(): Promise<
  "none" | "awaiting_verification" | "verified" | "expired"
> {
  const resolved = await loadActiveRecoverySession();
  if (resolved.status === "missing") return "none";
  if (resolved.status === "expired" || resolved.status === "locked") return "expired";
  return resolved.session.verifiedAt ? "verified" : "awaiting_verification";
}

/**
 * The questions to render on the /recover-account step.
 *
 * Returns the user's own three questions when a live recovery session exists.
 * Otherwise it returns a DECOY set drawn from the public catalogue, so the page
 * renders identically for an email that is not registered. The decoy path can
 * never succeed: there is no session row for its cookie, so verification fails
 * with the same generic error a wrong answer produces.
 */
export async function getRecoveryChallenge(): Promise<{
  state: "none" | "awaiting_verification" | "verified" | "expired";
  questions: RecoveryQuestion[];
  message: string;
}> {
  const state = await getRecoverySessionState();

  if (state === "awaiting_verification") {
    const token = await readRecoveryToken();
    if (token) {
      const session = await prisma.passwordRecoverySession.findUnique({
        where: { tokenHash: hashToken(token) },
        select: { userId: true },
      });

      if (session) {
        const answers = await prisma.userSecurityAnswer.findMany({
          where: { userId: session.userId },
          orderBy: { createdAt: "asc" },
          select: { questionId: true, question: { select: { question: true } } },
        });

        if (answers.length >= REQUIRED_SECURITY_QUESTION_COUNT) {
          return {
            state,
            questions: answers.map((a) => ({
              questionId: a.questionId,
              question: a.question.question,
            })),
            message: GENERIC_RECOVERY_START_MESSAGE,
          };
        }
      }
    }
  }

  return {
    state: state === "expired" ? "expired" : state === "verified" ? "verified" : "none",
    questions: await loadCatalogueQuestions(REQUIRED_SECURITY_QUESTION_COUNT),
    message: GENERIC_RECOVERY_START_MESSAGE,
  };
}

/**
 * Change the password for a signed-in user (not a recovery).
 * Kept here so both password paths share one place where sessions are
 * invalidated and audited.
 */
export async function changePasswordForUser(input: {
  userId: string;
  currentPasswordHash: string;
  currentPassword: string;
  newPassword: string;
  headers: Headers;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId, currentPasswordHash, currentPassword, newPassword, headers } = input;

  const limit = await rateLimit({
    key: rateLimitKeys.changePasswordByUser(userId),
    ...RATE_LIMITS.changePasswordByUser,
  });
  if (!limit.ok) {
    return {
      ok: false,
      error: "Too many attempts. Please wait a little while and try again.",
    };
  }

  const currentValid = await verifyPassword(currentPassword, currentPasswordHash);
  if (!currentValid) {
    await recordAuditEvent({
      userId,
      event: "LOGIN_FAILED",
      ipHash: hashIpFromHeaders(headers),
      userAgent: headers.get("user-agent"),
      metadata: { context: "password_change" },
    });
    return { ok: false, error: "Your current password is incorrect." };
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, passwordChangedAt: new Date() },
  });

  // Signing out other devices is the safe default after a credential change.
  await invalidateAllSessions(userId);

  await recordAuditEvent({
    userId,
    event: "PASSWORD_CHANGED",
    ipHash: hashIpFromHeaders(headers),
    userAgent: headers.get("user-agent"),
  });

  return { ok: true };
}
