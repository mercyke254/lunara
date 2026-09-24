import { prisma } from "@/lib/db/prisma";
import { recordAuditEvent } from "@/lib/security/audit";
import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * Personal data export.
 *
 * DESIGN RULES
 *
 *  1. INCLUDE everything the user has told Lunara about themselves.
 *  2. EXCLUDE every credential and every cryptographic artefact. This is
 *     enforced structurally, not by a filter: each query uses an explicit
 *     `select` listing only safe fields, so a newly added secret column cannot
 *     silently start appearing in exports.
 *  3. NEVER include: password hashes, security-answer hashes, session token
 *     hashes, recovery token hashes, rate-limit keys, or AUTH_SECRET-derived
 *     digests (including the hashed IP addresses on audit rows).
 *
 * The result is a plain object that serialises cleanly to JSON.
 */

export const EXPORT_VERSION = "1.0";

export interface LunaraExport {
  exportVersion: string;
  exportedAt: string;
  application: {
    name: string;
    note: string;
    excluded: string[];
  };
  account: Record<string, unknown>;
  profile: Record<string, unknown> | null;
  securityQuestions: Array<{ question: string; answeredAt: string }>;
  cycles: unknown[];
  periods: unknown[];
  dailyLogs: unknown[];
  wellnessLogs: unknown[];
  intimateLogs: unknown[];
  fertilityRecords: unknown[];
  pregnancies: unknown[];
  reminders: unknown[];
  notifications: unknown[];
  auditEvents: unknown[];
}

export async function buildUserExport(
  userId: string,
): Promise<LunaraExport | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      // Explicitly NO passwordHash, NO sessionsInvalidBefore.
      id: true,
      name: true,
      email: true,
      dateOfBirth: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
      onboardedAt: true,
    },
  });

  if (!user) return null;

  const [
    profile,
    securityAnswers,
    cycles,
    periods,
    dailyLogs,
    wellnessLogs,
    intimateLogs,
    fertilityRecords,
    pregnancies,
    reminders,
    notifications,
    auditEvents,
  ] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId },
      select: {
        ageRange: true,
        averageCycleLength: true,
        averagePeriodLength: true,
        lastPeriodStart: true,
        cycleRegularity: true,
        trackingGoals: true,
        notificationsEnabled: true,
        shareAnonymousStats: true,
        createdAt: true,
        updatedAt: true,
      },
    }),

    // The QUESTIONS the user chose are exportable; the answer HASHES are not.
    prisma.userSecurityAnswer.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, question: { select: { question: true } } },
    }),

    prisma.cycle.findMany({
      where: { userId },
      orderBy: { startDate: "asc" },
      select: {
        startDate: true,
        endDate: true,
        cycleLength: true,
        periodLength: true,
        estimated: true,
        notes: true,
      },
    }),

    prisma.period.findMany({
      where: { userId },
      orderBy: { startDate: "asc" },
      select: { startDate: true, endDate: true, notes: true },
    }),

    prisma.dailyLog.findMany({
      where: { userId },
      orderBy: { date: "asc" },
      select: {
        date: true,
        notes: true,
        symptoms: { select: { type: true, severity: true } },
        moods: { select: { type: true } },
      },
    }),

    prisma.wellnessLog.findMany({
      where: { userId },
      orderBy: { date: "asc" },
      select: {
        date: true,
        weight: true,
        temperature: true,
        sleep: true,
        sleepQuality: true,
        energy: true,
        stress: true,
        water: true,
        exercise: true,
        exerciseMinutes: true,
      },
    }),

    // Included because it is the user's own data. Sensitive, but withholding it
    // would make the export incomplete.
    prisma.intimateLog.findMany({
      where: { userId },
      orderBy: { date: "asc" },
      select: {
        date: true,
        activityType: true,
        protectionUsed: true,
        notes: true,
      },
    }),

    prisma.fertilityRecord.findMany({
      where: { userId },
      orderBy: { date: "asc" },
      select: { date: true, type: true, estimated: true, note: true },
    }),

    prisma.pregnancy.findMany({
      where: { userId },
      orderBy: { startDate: "asc" },
      select: { startDate: true, dueDate: true, active: true, endedAt: true },
    }),

    prisma.reminder.findMany({
      where: { userId },
      orderBy: { type: "asc" },
      select: {
        type: true,
        enabled: true,
        label: true,
        timeOfDay: true,
        leadTimeDays: true,
        scheduledAt: true,
      },
    }),

    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: {
        type: true,
        title: true,
        message: true,
        read: true,
        scheduledFor: true,
        createdAt: true,
      },
    }),

    // Audit rows are exported WITHOUT ipHash (a pseudonym derived from the
    // server secret) since it is not user-meaningful and is not needed.
    prisma.auditEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { event: true, createdAt: true, userAgent: true, metadata: true },
    }),
  ]);

  const exportPayload: LunaraExport = {
    exportVersion: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    application: {
      name: "Lunara",
      note: "This file contains the personal data Lunara holds about you. Dates in calendar fields are plain calendar days (no timezone applied).",
      excluded: [
        "password hash",
        "security-question answer hashes",
        "session tokens and their hashes",
        "account-recovery tokens and their hashes",
        "server secrets and signed IP digests",
      ],
    },
    account: user as Record<string, unknown>,
    profile: profile as Record<string, unknown> | null,
    securityQuestions: securityAnswers.map((answer) => ({
      question: answer.question.question,
      answeredAt: answer.createdAt.toISOString(),
    })),
    cycles,
    periods,
    dailyLogs,
    wellnessLogs,
    intimateLogs,
    fertilityRecords,
    pregnancies,
    reminders,
    notifications,
    auditEvents,
  };

  return exportPayload;
}

/**
 * Build an export and record that it happened.
 * Returns the payload plus a suggested filename.
 */
export async function createExport(userId: string): Promise<{
  payload: LunaraExport;
  filename: string;
} | null> {
  const payload = await buildUserExport(userId);
  if (!payload) return null;

  await recordAuditEvent({
    userId,
    event: "DATA_EXPORTED",
    metadata: { exportVersion: EXPORT_VERSION },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return { payload, filename: `lunara-export-${stamp}.json` };
}

/** Serialise an export payload, handling Prisma's Decimal/Date shapes. */
export function serialiseExport(payload: LunaraExport): string {
  return JSON.stringify(
    payload,
    (_key, value) => {
      // Prisma Decimal (used for water intake) is not JSON-native; it exposes a
      // toJSON that yields a string, which is fine, but being explicit avoids
      // any surprise if the column type changes.
      if (typeof value === "object" && value !== null && "toFixed" in value) {
        return Number(value);
      }
      return value;
    },
    2,
  );
}

export type { Prisma };
