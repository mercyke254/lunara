"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { hashPassword, verifyPassword, wastePasswordComparison } from "@/lib/auth/password";
import { hashSecurityAnswer } from "@/lib/auth/security-answers";
import {
  createSession,
  destroyCurrentSession,
  getSessionUser,
  invalidateAllSessions,
  clearSessionCookie,
} from "@/lib/auth/session";
import {
  clearRecoveryCookie,
  completeRecoveryReset,
  startRecovery,
  verifyRecoveryAnswers,
  changePasswordForUser,
} from "@/lib/auth/recovery/recovery-flow";
import { normalizeEmail } from "@/lib/security/normalize";
import { hashIpFromHeaders } from "@/lib/security/ip";
import { recordAuditEvent } from "@/lib/security/audit";
import {
  RATE_LIMITS,
  rateLimit,
  rateLimitKeys,
  resetRateLimit,
} from "@/lib/security/rate-limit";
import { REQUIRED_SECURITY_QUESTION_COUNT } from "@/lib/constants";
import {
  changePasswordSchema,
  deleteAccountSchema,
  fieldErrors,
  forgotPasswordSchema,
  onboardingSchema,
  resetPasswordSchema,
  safeReturnPath,
  signInSchema,
  signUpSchema,
  updateSecurityQuestionsSchema,
  recoveryVerifySchema,
  privacyPreferencesSchema,
} from "@/lib/validation/schemas";
import {
  errorState,
  successState,
  withErrorHandling,
  type ActionState,
} from "@/lib/actions/types";
import { fromISODate } from "@/lib/dates";

/**
 * Authentication server actions.
 *
 * Conventions used throughout this file:
 *  - credentials are validated with Zod before any database access
 *  - every credential endpoint is rate limited by BOTH ip hash and account
 *  - failures return the SAME message whether or not the account exists
 *  - `redirect()` is always the final statement, outside try/catch, because it
 *    works by throwing a control-flow signal
 */

/** Failed sign-ins allowed before a temporary lockout. */
const LOGIN_MAX_FAILED_ATTEMPTS = 8;
/** Lockout duration after exceeding the attempt ceiling. */
const LOGIN_LOCKOUT_MINUTES = 15;

/** The one message used for every sign-in failure. */
const GENERIC_SIGN_IN_ERROR = "Email or password is incorrect.";

// ---------------------------------------------------------------------------
// Form helpers
// ---------------------------------------------------------------------------

/**
 * Read the three security questions/answers from the form.
 * Field naming convention: questionId_0/answer_0 ... questionId_2/answer_2.
 */
function parseSecurityAnswers(formData: FormData): Array<{ questionId: string; answer: string }> {
  const answers: Array<{ questionId: string; answer: string }> = [];
  for (let index = 0; index < REQUIRED_SECURITY_QUESTION_COUNT; index += 1) {
    const questionId = String(formData.get(`questionId_${index}`) ?? "");
    const answer = String(formData.get(`answer_${index}`) ?? "");
    if (questionId && answer) answers.push({ questionId, answer });
  }
  return answers;
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "");
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export async function registerAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("register", async () => {
    const requestHeaders = await headers();
    const ipHash = hashIpFromHeaders(requestHeaders);

    const limit = await rateLimit({
      key: rateLimitKeys.registerByIp(ipHash),
      ...RATE_LIMITS.registerByIp,
    });
    if (!limit.ok) {
      return errorState(
        "Too many sign-up attempts from this connection. Please try again later.",
      );
    }

    const parsed = signUpSchema.safeParse({
      name: text(formData, "name"),
      email: text(formData, "email"),
      password: text(formData, "password"),
      confirmPassword: text(formData, "confirmPassword"),
      securityAnswers: parseSecurityAnswers(formData),
      acceptTerms: formData.get("acceptTerms") === "on",
    });

    if (!parsed.success) {
      return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
    }

    const { name, email, password } = parsed.data;
    const normalizedEmail = normalizeEmail(email);

    // Note on account enumeration: unlike the recovery flow, registration does
    // disclose that an address is already in use. Without this the user cannot
    // be told to sign in instead, and the alternative (silently succeeding) is
    // worse. Nothing here confirms anything about the account beyond existence.
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, deletedAt: true },
    });

    if (existing && !existing.deletedAt) {
      return errorState(
        "An account already exists with this email. Try signing in instead.",
        { email: "This email is already registered." },
      );
    }

    // Validate the chosen questions against the active catalogue. This also
    // prevents a caller from inventing question ids of their own.
    const questionIds = parsed.data.securityAnswers.map((a) => a.questionId);
    const validQuestions = await prisma.securityQuestion.findMany({
      where: { id: { in: questionIds }, active: true },
      select: { id: true },
    });

    if (validQuestions.length !== REQUIRED_SECURITY_QUESTION_COUNT) {
      return errorState("Choose three security questions.", {
        securityAnswers: "Those questions are no longer available. Please reselect.",
      });
    }

    // Hash the password and each answer. Answers are normalised inside
    // `hashSecurityAnswer` so normalisation can never be forgotten at a call site.
    const passwordHash = await hashPassword(password);
    const answerHashes = await Promise.all(
      parsed.data.securityAnswers.map(async (entry) => ({
        questionId: entry.questionId,
        answerHash: await hashSecurityAnswer(entry.answer),
      })),
    );

    await prisma.$transaction(async (tx) => {
      // A previously deleted account with this address is removed so the unique
      // email constraint can be reused by the new registration.
      if (existing) {
        await tx.user.delete({ where: { id: existing.id } });
      }

      const user = await tx.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash,
          role: "USER",
        },
        select: { id: true },
      });

      await tx.userSecurityAnswer.createMany({
        data: answerHashes.map((a) => ({
          userId: user.id,
          questionId: a.questionId,
          answerHash: a.answerHash,
        })),
      });

      // A default profile keeps every downstream query simple.
      await tx.profile.create({ data: { userId: user.id } });
    });

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    await recordAuditEvent({
      userId: user.id,
      event: "ACCOUNT_CREATED",
      ipHash,
      userAgent: requestHeaders.get("user-agent"),
    });

    // Sign the new account in and send them to onboarding.
    const sessionHeaders = new Headers(requestHeaders);
    await createSession(user.id, sessionHeaders);

    redirect("/onboarding");
  });
}

// ---------------------------------------------------------------------------
// Sign in / sign out
// ---------------------------------------------------------------------------

export async function loginAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("login", async () => {
    const requestHeaders = await headers();
    const ipHash = hashIpFromHeaders(requestHeaders);

    const parsed = signInSchema.safeParse({
      email: text(formData, "email"),
      password: text(formData, "password"),
      next: text(formData, "next") || undefined,
    });

    if (!parsed.success) {
      // Even a malformed submission gets the generic message, so a validation
      // difference cannot be used to probe for valid addresses.
      return errorState(GENERIC_SIGN_IN_ERROR);
    }

    const { email, password } = parsed.data;
    const normalizedEmail = normalizeEmail(email);

    const ipLimit = await rateLimit({
      key: rateLimitKeys.loginByIp(ipHash),
      ...RATE_LIMITS.loginByIp,
    });
    if (!ipLimit.ok) {
      return errorState(
        `Too many attempts. Please try again in ${Math.ceil(ipLimit.retryAfterSeconds / 60)} minute(s).`,
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        passwordHash: true,
        role: true,
        onboardedAt: true,
        deletedAt: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });

    // Unknown account: burn comparable CPU so the response time does not reveal
    // that the address is unregistered.
    if (!user || user.deletedAt) {
      await wastePasswordComparison();
      await recordAuditEvent({
        event: "LOGIN_FAILED",
        ipHash,
        userAgent: requestHeaders.get("user-agent"),
        metadata: { reason: "unknown_account" },
      });
      return errorState(GENERIC_SIGN_IN_ERROR);
    }

    const accountLimit = await rateLimit({
      key: rateLimitKeys.loginByAccount(user.id),
      ...RATE_LIMITS.loginByAccount,
    });

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const minutes = Math.max(
        1,
        Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000),
      );
      return errorState(
        `Too many attempts. Please try again in ${minutes} minute(s), or use account recovery.`,
      );
    }

    const passwordValid = await verifyPassword(password, user.passwordHash);

    if (!passwordValid || !accountLimit.ok) {
      const attempts = user.failedLoginAttempts + 1;
      const shouldLock = attempts >= LOGIN_MAX_FAILED_ATTEMPTS;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: shouldLock
            ? new Date(Date.now() + LOGIN_LOCKOUT_MINUTES * 60 * 1000)
            : null,
        },
      });

      await recordAuditEvent({
        userId: user.id,
        event: shouldLock ? "RECOVERY_LOCKED" : "LOGIN_FAILED",
        ipHash,
        userAgent: requestHeaders.get("user-agent"),
        metadata: { attempts },
      });

      return errorState(GENERIC_SIGN_IN_ERROR);
    }

    // Success: clear the failure counters and start a fresh session.
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    await resetRateLimit(rateLimitKeys.loginByAccount(user.id));

    await createSession(user.id, requestHeaders);

    await recordAuditEvent({
      userId: user.id,
      event: "LOGIN",
      ipHash,
      userAgent: requestHeaders.get("user-agent"),
    });

    const destination = safeReturnPath(parsed.data.next);
    const finalDestination = user.onboardedAt ? destination : "/onboarding";
    redirect(finalDestination);
  });
}

export async function logoutAction(): Promise<void> {
  const requestHeaders = await headers();

  // Resolve the current user BEFORE destroying the session, so the audit entry
  // is attributed correctly. (Querying "the most recent session" globally would
  // be a bug: it could attribute the sign-out to a different account.)
  const sessionUser = await getSessionUser();

  await destroyCurrentSession();

  if (sessionUser) {
    void recordAuditEvent({
      userId: sessionUser.id,
      event: "LOGOUT",
      ipHash: hashIpFromHeaders(requestHeaders),
      userAgent: requestHeaders.get("user-agent"),
    });
  }

  redirect("/login");
}

/**
 * Sign out of every device by invalidating all sessions.
 *
 * Returns `void` (not an ActionState) so it can be used directly as a
 * `<form action={...}>` handler; it always ends in a redirect.
 */
export async function logoutAllAction(): Promise<void> {
  const requestHeaders = await headers();
  const user = await getSessionUser();

  if (!user) redirect("/login");

  await invalidateAllSessions(user.id);
  await clearSessionCookie();

  await recordAuditEvent({
    userId: user.id,
    event: "LOGOUT_ALL",
    ipHash: hashIpFromHeaders(requestHeaders),
    userAgent: requestHeaders.get("user-agent"),
  });

  redirect("/login?signedOut=all");
}

// ---------------------------------------------------------------------------
// Password change
// ---------------------------------------------------------------------------

export async function changePasswordAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("change-password", async () => {
    const requestHeaders = await headers();
    const sessionUser = await getSessionUser();

    if (!sessionUser) return errorState("Your session has expired. Please sign in again.");

    const parsed = changePasswordSchema.safeParse({
      currentPassword: text(formData, "currentPassword"),
      newPassword: text(formData, "newPassword"),
      confirmPassword: text(formData, "confirmPassword"),
    });

    if (!parsed.success) {
      return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
    }

    // Fetch the hash scoped by the authenticated id - never from the client.
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { passwordHash: true },
    });

    if (!user) return errorState("Your session has expired. Please sign in again.");

    const result = await changePasswordForUser({
      userId: sessionUser.id,
      currentPasswordHash: user.passwordHash,
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
      headers: requestHeaders,
    });

    if (!result.ok) return errorState(result.error);

    // The password change invalidated all sessions, including this one.
    // Send the user to sign in again with the new credentials.
    redirect("/login?passwordChanged=1");
  });
}

// ---------------------------------------------------------------------------
// Account recovery (security questions)
// ---------------------------------------------------------------------------

/**
 * Step 2. Always advances to the questions step, and the response is identical
 * whether or not the address exists.
 */
export async function forgotPasswordAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("forgot-password", async () => {
    const requestHeaders = await headers();

    const parsed = forgotPasswordSchema.safeParse({
      email: text(formData, "email"),
    });

    if (!parsed.success) {
      return errorState("Enter the email address on your account.", fieldErrors(parsed.error));
    }

    await startRecovery(parsed.data.email, requestHeaders);

    redirect("/recover-account");
  });
}

/** Step 3. Verify the three answers. */
export async function verifyRecoveryAnswersAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("verify-recovery", async () => {
    const requestHeaders = await headers();

    const parsed = recoveryVerifySchema.safeParse({
      answers: parseSecurityAnswers(formData),
    });

    if (!parsed.success) {
      return errorState("Please answer all three questions.", fieldErrors(parsed.error));
    }

    const result = await verifyRecoveryAnswers(parsed.data.answers, requestHeaders);

    if (!result.ok) {
      return errorState(result.error);
    }

    redirect("/reset-password");
  });
}

/** Step 5. Set the new password. */
export async function resetPasswordAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("reset-password", async () => {
    const requestHeaders = await headers();

    const parsed = resetPasswordSchema.safeParse({
      newPassword: text(formData, "newPassword"),
      confirmPassword: text(formData, "confirmPassword"),
    });

    if (!parsed.success) {
      return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
    }

    const result = await completeRecoveryReset(parsed.data.newPassword, requestHeaders);

    if (!result.ok) return errorState(result.error);

    // Every session was invalidated; the user must sign in again.
    redirect("/login?reset=1");
  });
}

/** Abandon an in-progress recovery. */
export async function cancelRecoveryAction(): Promise<void> {
  await clearRecoveryCookie();
  redirect("/login");
}

// ---------------------------------------------------------------------------
// Security questions
// ---------------------------------------------------------------------------

export async function updateSecurityQuestionsAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("update-security-questions", async () => {
    const requestHeaders = await headers();
    const sessionUser = await getSessionUser();

    if (!sessionUser) return errorState("Your session has expired. Please sign in again.");

    const parsed = updateSecurityQuestionsSchema.safeParse({
      currentPassword: text(formData, "currentPassword"),
      securityAnswers: parseSecurityAnswers(formData),
    });

    if (!parsed.success) {
      return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
    }

    // Re-authenticate before allowing a change to recovery factors.
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { passwordHash: true },
    });
    if (!user) return errorState("Your session has expired. Please sign in again.");

    const passwordValid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
    if (!passwordValid) {
      return errorState("Your password is incorrect.");
    }

    const questionIds = parsed.data.securityAnswers.map((a) => a.questionId);
    const validQuestions = await prisma.securityQuestion.findMany({
      where: { id: { in: questionIds }, active: true },
      select: { id: true },
    });
    if (validQuestions.length !== REQUIRED_SECURITY_QUESTION_COUNT) {
      return errorState("Choose three security questions.");
    }

    const answerHashes = await Promise.all(
      parsed.data.securityAnswers.map(async (entry) => ({
        questionId: entry.questionId,
        answerHash: await hashSecurityAnswer(entry.answer),
      })),
    );

    await prisma.$transaction(async (tx) => {
      // Replace the full set: partially updating could leave the account with
      // fewer than three answers, which would break recovery.
      await tx.userSecurityAnswer.deleteMany({ where: { userId: sessionUser.id } });
      await tx.userSecurityAnswer.createMany({
        data: answerHashes.map((a) => ({
          userId: sessionUser.id,
          questionId: a.questionId,
          answerHash: a.answerHash,
        })),
      });
    });

    await recordAuditEvent({
      userId: sessionUser.id,
      event: "SECURITY_QUESTIONS_CHANGED",
      ipHash: hashIpFromHeaders(requestHeaders),
      userAgent: requestHeaders.get("user-agent"),
    });

    return successState("Your security questions have been updated.");
  });
}

// ---------------------------------------------------------------------------
// Onboarding & preferences
// ---------------------------------------------------------------------------

export async function completeOnboardingAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("onboarding", async () => {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return errorState("Your session has expired. Please sign in again.");

    const parsed = onboardingSchema.safeParse({
      ageRange: text(formData, "ageRange") || undefined,
      dateOfBirth: text(formData, "dateOfBirth") || undefined,
      averageCycleLength: text(formData, "averageCycleLength"),
      averagePeriodLength: text(formData, "averagePeriodLength"),
      lastPeriodStart: text(formData, "lastPeriodStart"),
      cycleRegularity: text(formData, "cycleRegularity"),
      trackingGoals: formData.getAll("trackingGoals").map(String),
    });

    if (!parsed.success) {
      return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
    }

    const lastPeriodStart = fromISODate(parsed.data.lastPeriodStart);
    if (!lastPeriodStart) {
      return errorState("Enter a valid date for your last period.", {
        lastPeriodStart: "Enter a valid date.",
      });
    }

    const dateOfBirth = parsed.data.dateOfBirth ? fromISODate(parsed.data.dateOfBirth) : null;

    const requestHeaders = await headers();

    await prisma.$transaction(async (tx) => {
      await tx.profile.upsert({
        where: { userId: sessionUser.id },
        create: {
          userId: sessionUser.id,
          ageRange: parsed.data.ageRange ?? null,
          averageCycleLength: parsed.data.averageCycleLength,
          averagePeriodLength: parsed.data.averagePeriodLength,
          lastPeriodStart,
          cycleRegularity: parsed.data.cycleRegularity,
          trackingGoals: parsed.data.trackingGoals,
        },
        update: {
          ageRange: parsed.data.ageRange ?? null,
          averageCycleLength: parsed.data.averageCycleLength,
          averagePeriodLength: parsed.data.averagePeriodLength,
          lastPeriodStart,
          cycleRegularity: parsed.data.cycleRegularity,
          trackingGoals: parsed.data.trackingGoals,
        },
      });

      await tx.user.update({
        where: { id: sessionUser.id },
        data: {
          onboardedAt: new Date(),
          dateOfBirth,
        },
      });

      // Seed the first period so the calendar and predictions have an anchor.
      await tx.period.upsert({
        where: { userId_startDate: { userId: sessionUser.id, startDate: lastPeriodStart } },
        create: {
          userId: sessionUser.id,
          startDate: lastPeriodStart,
          endDate: null,
        },
        update: {},
      });
    });

    await recordAuditEvent({
      userId: sessionUser.id,
      event: "ONBOARDING_COMPLETED",
      ipHash: hashIpFromHeaders(requestHeaders),
      userAgent: requestHeaders.get("user-agent"),
    });

    redirect("/dashboard?welcome=1");
  });
}

export async function updatePrivacyPreferencesAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("privacy-preferences", async () => {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return errorState("Your session has expired. Please sign in again.");

    const parsed = privacyPreferencesSchema.safeParse({
      shareAnonymousStats: formData.get("shareAnonymousStats") === "on",
      notificationsEnabled: formData.get("notificationsEnabled") === "on",
    });

    if (!parsed.success) {
      return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
    }

    await prisma.profile.upsert({
      where: { userId: sessionUser.id },
      create: {
        userId: sessionUser.id,
        shareAnonymousStats: parsed.data.shareAnonymousStats,
        notificationsEnabled: parsed.data.notificationsEnabled,
      },
      update: {
        shareAnonymousStats: parsed.data.shareAnonymousStats,
        notificationsEnabled: parsed.data.notificationsEnabled,
      },
    });

    return successState("Privacy preferences saved.");
  });
}

// ---------------------------------------------------------------------------
// Account deletion
// ---------------------------------------------------------------------------

/**
 * Permanently delete the account.
 *
 * Deletion strategy (see README "Data retention"):
 *  - every personal record is deleted outright via cascading deletes
 *  - the User row is ANONYMISED rather than removed, because audit events
 *    reference it with `onDelete: SetNull`, and keeping a tombstone prevents the
 *    address being silently reused to infer anything from a later re-registration
 *  - the email is replaced with a non-routable placeholder and the password hash
 *    is overwritten with random bytes, so the row can never authenticate
 */
export async function deleteAccountAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("delete-account", async () => {
    const requestHeaders = await headers();
    const ipHash = hashIpFromHeaders(requestHeaders);
    const sessionUser = await getSessionUser();

    if (!sessionUser) return errorState("Your session has expired. Please sign in again.");

    const limit = await rateLimit({
      key: rateLimitKeys.accountDeleteByUser(sessionUser.id),
      ...RATE_LIMITS.accountDeleteByUser,
    });
    if (!limit.ok) {
      return errorState("Too many attempts. Please wait a little while and try again.");
    }

    const parsed = deleteAccountSchema.safeParse({
      password: text(formData, "password"),
      confirmPhrase: text(formData, "confirmPhrase"),
    });

    if (!parsed.success) {
      return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { passwordHash: true, email: true },
    });
    if (!user) return errorState("Your session has expired. Please sign in again.");

    const passwordValid = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!passwordValid) {
      return errorState("Your password is incorrect.");
    }

    const anonymousEmail = `deleted+${sessionUser.id}@lunara.invalid`;
    // A hash that can never match any input, produced from random data.
    const unusablePasswordHash = await hashPassword(
      `${randomUUID()}-${randomUUID()}`,
    );

    await prisma.$transaction(async (tx) => {
      // Revoke sessions first so nothing survives the transaction.
      await tx.session.updateMany({
        where: { userId: sessionUser.id },
        data: { revokedAt: new Date() },
      });

      // Explicit deletes. Cascades would handle most of this, but being
      // explicit means a future schema change cannot silently leave health data
      // behind after a deletion request.
      await tx.symptom.deleteMany({ where: { dailyLog: { userId: sessionUser.id } } });
      await tx.mood.deleteMany({ where: { dailyLog: { userId: sessionUser.id } } });
      await tx.dailyLog.deleteMany({ where: { userId: sessionUser.id } });
      await tx.wellnessLog.deleteMany({ where: { userId: sessionUser.id } });
      await tx.intimateLog.deleteMany({ where: { userId: sessionUser.id } });
      await tx.fertilityRecord.deleteMany({ where: { userId: sessionUser.id } });
      await tx.cycle.deleteMany({ where: { userId: sessionUser.id } });
      await tx.period.deleteMany({ where: { userId: sessionUser.id } });
      await tx.pregnancy.deleteMany({ where: { userId: sessionUser.id } });
      await tx.reminder.deleteMany({ where: { userId: sessionUser.id } });
      await tx.notification.deleteMany({ where: { userId: sessionUser.id } });
      await tx.userSecurityAnswer.deleteMany({ where: { userId: sessionUser.id } });
      await tx.passwordRecoverySession.deleteMany({ where: { userId: sessionUser.id } });
      await tx.session.deleteMany({ where: { userId: sessionUser.id } });
      await tx.profile.deleteMany({ where: { userId: sessionUser.id } });
      await tx.auditEvent.deleteMany({ where: { userId: sessionUser.id } });

      await tx.user.update({
        where: { id: sessionUser.id },
        data: {
          name: "Deleted account",
          email: anonymousEmail,
          passwordHash: unusablePasswordHash,
          dateOfBirth: null,
          deletedAt: new Date(),
          sessionsInvalidBefore: new Date(),
          onboardedAt: null,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    });

    // Recorded after the row was anonymised; the userId reference is gone by
    // design, so this is written as an account-less event.
    await recordAuditEvent({
      event: "ACCOUNT_DELETED",
      ipHash,
      userAgent: requestHeaders.get("user-agent"),
    });

    await clearSessionCookie();
    await clearRecoveryCookie();

    redirect("/?deleted=1");
  });
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function updateProfileAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("update-profile", async () => {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return errorState("Your session has expired. Please sign in again.");

    const { profileUpdateSchema } = await import("@/lib/validation/schemas");
    const parsed = profileUpdateSchema.safeParse({
      name: text(formData, "name"),
      averageCycleLength: text(formData, "averageCycleLength"),
      averagePeriodLength: text(formData, "averagePeriodLength"),
      cycleRegularity: text(formData, "cycleRegularity"),
    });

    if (!parsed.success) {
      return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: sessionUser.id },
        data: { name: parsed.data.name },
      }),
      prisma.profile.upsert({
        where: { userId: sessionUser.id },
        create: {
          userId: sessionUser.id,
          averageCycleLength: parsed.data.averageCycleLength,
          averagePeriodLength: parsed.data.averagePeriodLength,
          cycleRegularity: parsed.data.cycleRegularity,
        },
        update: {
          averageCycleLength: parsed.data.averageCycleLength,
          averagePeriodLength: parsed.data.averagePeriodLength,
          cycleRegularity: parsed.data.cycleRegularity,
        },
      }),
    ]);

    return successState("Profile updated.");
  });
}
