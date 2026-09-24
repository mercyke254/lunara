import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { buildCyclePrediction, type CyclePrediction } from "@/lib/calculations/cycle";
import { today } from "@/lib/dates";

/**
 * Server-side identity resolution.
 *
 * THE SINGLE SOURCE OF TRUTH for "who is making this request". Every
 * user-owned query in the application must be scoped using this identity - the
 * userId is never accepted from the client (no hidden form field, no query
 * parameter, no request body).
 */

export type { SessionUser };

/** The signed-in user, or null. Safe to call anywhere on the server. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  return getSessionUser();
}

/**
 * Require an authenticated user or redirect to sign-in.
 * `returnTo` is a path only - it is validated by the caller before use so it can
 * never become an open redirect.
 */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    const target = returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : "/login";
    redirect(target);
  }
  return user;
}

/** Require a user who has finished onboarding, otherwise send them there. */
export async function requireOnboardedUser(
  returnTo?: string,
): Promise<{ user: SessionUser; profile: ProfileSummary }> {
  const user = await requireUser(returnTo);
  const profile = await getProfileSummary(user.id);

  if (!user.onboardedAt) {
    redirect("/onboarding");
  }

  return { user, profile };
}

/** Require an administrator. Non-admins get a 404, not a 403, to avoid
 * disclosing that an admin area exists at this path. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser("/admin");
  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }
  return user;
}

export interface ProfileSummary {
  id: string;
  ageRange: string | null;
  averageCycleLength: number;
  averagePeriodLength: number;
  lastPeriodStart: Date | null;
  cycleRegularity: "REGULAR" | "SOMEWHAT_IRREGULAR" | "IRREGULAR" | "UNKNOWN";
  trackingGoals: string[];
  notificationsEnabled: boolean;
  shareAnonymousStats: boolean;
  dateOfBirth: Date | null;
}

/** Load the cycle-relevant profile, creating a default row if absent. */
export async function getProfileSummary(userId: string): Promise<ProfileSummary> {
  const existing = await prisma.profile.findUnique({ where: { userId } });
  if (existing) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { dateOfBirth: true },
    });
    return {
      id: existing.id,
      ageRange: existing.ageRange,
      averageCycleLength: existing.averageCycleLength,
      averagePeriodLength: existing.averagePeriodLength,
      lastPeriodStart: existing.lastPeriodStart,
      cycleRegularity: existing.cycleRegularity,
      trackingGoals: existing.trackingGoals,
      notificationsEnabled: existing.notificationsEnabled,
      shareAnonymousStats: existing.shareAnonymousStats,
      dateOfBirth: user?.dateOfBirth ?? null,
    };
  }

  const created = await prisma.profile.create({ data: { userId } });
  return {
    id: created.id,
    ageRange: created.ageRange,
    averageCycleLength: created.averageCycleLength,
    averagePeriodLength: created.averagePeriodLength,
    lastPeriodStart: created.lastPeriodStart,
    cycleRegularity: created.cycleRegularity,
    trackingGoals: created.trackingGoals,
    notificationsEnabled: created.notificationsEnabled,
    shareAnonymousStats: created.shareAnonymousStats,
    dateOfBirth: null,
  };
}

/**
 * Load the user's cycle history and compute a prediction.
 *
 * Always scoped by `userId`. History is capped for performance; the engine only
 * needs recent cycles to estimate, and older rows add noise rather than signal.
 */
export async function getCyclePrediction(
  userId: string,
  options: { historyLimit?: number; reference?: Date } = {},
): Promise<{ prediction: CyclePrediction; profile: ProfileSummary }> {
  const historyLimit = options.historyLimit ?? 24;

  const [profile, cycles, periods] = await Promise.all([
    getProfileSummary(userId),
    prisma.cycle.findMany({
      where: { userId },
      orderBy: { startDate: "desc" },
      take: historyLimit,
      select: { startDate: true, endDate: true, cycleLength: true, periodLength: true },
    }),
    prisma.period.findMany({
      where: { userId },
      orderBy: { startDate: "desc" },
      take: historyLimit,
      select: { startDate: true, endDate: true },
    }),
  ]);

  const prediction = buildCyclePrediction({
    cycles,
    periods,
    profile: {
      averageCycleLength: profile.averageCycleLength,
      averagePeriodLength: profile.averagePeriodLength,
      lastPeriodStart: profile.lastPeriodStart,
      cycleRegularity: profile.cycleRegularity,
    },
    today: options.reference ?? today(),
  });

  return { prediction, profile };
}

/** Request headers, for IP hashing and audit context. */
export async function getRequestHeaders(): Promise<Headers> {
  return headers();
}
