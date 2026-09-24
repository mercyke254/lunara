import { prisma } from "@/lib/db/prisma";
import { addDays, today } from "@/lib/dates";
import type {
  ExerciseLevel,
  MoodType,
  SymptomType,
} from "@/lib/generated/prisma/enums";

/**
 * Read models for the tracking screens.
 *
 * EVERY function in this module takes `userId` as its first argument and uses it
 * in a `where` clause. That is the whole point of the module: there is exactly
 * one place to audit for query scoping, and no function here is capable of
 * returning another user's rows. Callers pass the id from the authenticated
 * server session (`requireUser()`), never from a form field or query string.
 *
 * Aggregations are computed in JavaScript from a bounded row set rather than via
 * SQL GROUP BY. Volumes here are inherently small (a few hundred rows per user
 * per year), and doing it in JS keeps the aggregation logic unit-testable and
 * avoids duplicating it across the chart and the text summary.
 */

// ---------------------------------------------------------------------------
// Daily logs
// ---------------------------------------------------------------------------

export interface DailyLogSummary {
  id: string;
  date: Date;
  notes: string | null;
  symptoms: { type: SymptomType; severity: number | null }[];
  moods: MoodType[];
}

export interface WellnessSummary {
  id: string;
  date: Date;
  sleep: number | null;
  sleepQuality: number | null;
  water: number | null;
  exercise: ExerciseLevel | null;
  exerciseMinutes: number | null;
  energy: number | null;
  stress: number | null;
  weight: number | null;
  temperature: number | null;
}

export async function getDailyLogsInRange(
  userId: string,
  from: Date,
  to: Date,
): Promise<DailyLogSummary[]> {
  const logs = await prisma.dailyLog.findMany({
    where: { userId, date: { gte: from, lte: to } },
    orderBy: { date: "desc" },
    select: {
      id: true,
      date: true,
      notes: true,
      symptoms: { select: { type: true, severity: true } },
      moods: { select: { type: true } },
    },
  });

  return logs.map((log) => ({
    id: log.id,
    date: log.date,
    notes: log.notes,
    symptoms: log.symptoms,
    moods: log.moods.map((m) => m.type),
  }));
}

export async function getDailyLogForDate(
  userId: string,
  date: Date,
): Promise<DailyLogSummary | null> {
  const log = await prisma.dailyLog.findUnique({
    where: { userId_date: { userId, date } },
    select: {
      id: true,
      date: true,
      notes: true,
      symptoms: { select: { type: true, severity: true } },
      moods: { select: { type: true } },
    },
  });

  if (!log) return null;
  return {
    id: log.id,
    date: log.date,
    notes: log.notes,
    symptoms: log.symptoms,
    moods: log.moods.map((m) => m.type),
  };
}

/**
 * The most recent logs that actually carry symptoms or moods.
 *
 * Used for the dashboard's "recent symptoms" strip: showing a log with only a
 * weight entry as "recent symptoms" would be misleading.
 */
export async function getRecentMeaningfulLogs(
  userId: string,
  limit = 8,
): Promise<DailyLogSummary[]> {
  const logs = await prisma.dailyLog.findMany({
    where: {
      userId,
      OR: [{ symptoms: { some: {} } }, { moods: { some: {} } }],
    },
    orderBy: { date: "desc" },
    take: limit,
    select: {
      id: true,
      date: true,
      notes: true,
      symptoms: { select: { type: true, severity: true } },
      moods: { select: { type: true } },
    },
  });

  return logs.map((log) => ({
    id: log.id,
    date: log.date,
    notes: log.notes,
    symptoms: log.symptoms,
    moods: log.moods.map((m) => m.type),
  }));
}

// ---------------------------------------------------------------------------
// Aggregations
// ---------------------------------------------------------------------------

export interface FrequencyRow<T extends string> {
  value: T;
  count: number;
  /** Mean severity across entries that recorded one. */
  averageSeverity?: number;
}

/** Symptom frequency over a window, most frequent first. */
export async function getSymptomFrequency(
  userId: string,
  days = 90,
): Promise<FrequencyRow<SymptomType>[]> {
  const from = addDays(today(), -days);

  // Scoped through the parent DailyLog, which is where ownership lives.
  const symptoms = await prisma.symptom.findMany({
    where: { dailyLog: { userId, date: { gte: from } } },
    select: { type: true, severity: true },
  });

  const counts = new Map<SymptomType, { count: number; severitySum: number; severityCount: number }>();

  for (const row of symptoms) {
    const entry = counts.get(row.type) ?? { count: 0, severitySum: 0, severityCount: 0 };
    entry.count += 1;
    if (row.severity !== null) {
      entry.severitySum += row.severity;
      entry.severityCount += 1;
    }
    counts.set(row.type, entry);
  }

  return [...counts.entries()]
    .map(([value, agg]) => ({
      value,
      count: agg.count,
      averageSeverity:
        agg.severityCount > 0
          ? Math.round((agg.severitySum / agg.severityCount) * 10) / 10
          : undefined,
    }))
    .sort((a, b) => b.count - a.count);
}

/** Mood frequency over a window, most frequent first. */
export async function getMoodFrequency(
  userId: string,
  days = 90,
): Promise<FrequencyRow<MoodType>[]> {
  const from = addDays(today(), -days);

  const moods = await prisma.mood.findMany({
    where: { dailyLog: { userId, date: { gte: from } } },
    select: { type: true },
  });

  const counts = new Map<MoodType, number>();
  for (const row of moods) {
    counts.set(row.type, (counts.get(row.type) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Symptom frequency bucketed by cycle phase.
 *
 * This is the query behind "cramps cluster in your luteal phase" style
 * observations. Bucketing is done here rather than in SQL so the phase rules
 * stay in one place (the calculation engine).
 */
export async function getSymptomPhaseBreakdown(
  userId: string,
  days = 180,
): Promise<Array<{ symptom: SymptomType; byPhase: Record<string, number> }>> {
  const from = addDays(today(), -days);

  const rows = await prisma.symptom.findMany({
    where: { dailyLog: { userId, date: { gte: from } } },
    select: { type: true, dailyLog: { select: { date: true } } },
  });

  const [cycles, periods] = await Promise.all([
    prisma.cycle.findMany({
      where: { userId },
      orderBy: { startDate: "desc" },
      take: 24,
      select: { startDate: true, endDate: true, cycleLength: true, periodLength: true },
    }),
    prisma.period.findMany({
      where: { userId },
      orderBy: { startDate: "desc" },
      take: 24,
      select: { startDate: true, endDate: true },
    }),
  ]);

  const { phaseForDate } = await import("@/lib/calculations/phase-lookup");
  const lookup = { cycles, periods, userId };

  const table = new Map<SymptomType, Record<string, number>>();

  for (const row of rows) {
    const phase = phaseForDate(row.dailyLog.date, lookup);
    const entry = table.get(row.type) ?? {};
    entry[phase] = (entry[phase] ?? 0) + 1;
    table.set(row.type, entry);
  }

  return [...table.entries()]
    .map(([symptom, byPhase]) => ({ symptom, byPhase }))
    .sort(
      (a, b) =>
        Object.values(b.byPhase).reduce((s, v) => s + v, 0) -
        Object.values(a.byPhase).reduce((s, v) => s + v, 0),
    );
}

// ---------------------------------------------------------------------------
// Wellness
// ---------------------------------------------------------------------------

export async function getWellnessLogsInRange(
  userId: string,
  from: Date,
  to: Date,
): Promise<WellnessSummary[]> {
  const logs = await prisma.wellnessLog.findMany({
    where: { userId, date: { gte: from, lte: to } },
    orderBy: { date: "asc" },
    select: {
      id: true,
      date: true,
      sleep: true,
      sleepQuality: true,
      water: true,
      exercise: true,
      exerciseMinutes: true,
      energy: true,
      stress: true,
      weight: true,
      temperature: true,
    },
  });

  return logs;
}

export async function getLatestWellnessLog(
  userId: string,
): Promise<WellnessSummary | null> {
  return prisma.wellnessLog.findFirst({
    where: { userId },
    orderBy: { date: "desc" },
    select: {
      id: true,
      date: true,
      sleep: true,
      sleepQuality: true,
      water: true,
      exercise: true,
      exerciseMinutes: true,
      energy: true,
      stress: true,
      weight: true,
      temperature: true,
    },
  });
}

// ---------------------------------------------------------------------------
// Periods / cycles
// ---------------------------------------------------------------------------

export interface PeriodRow {
  id: string;
  startDate: Date;
  endDate: Date | null;
  notes: string | null;
}

export async function getPeriodHistory(
  userId: string,
  limit = 24,
): Promise<PeriodRow[]> {
  return prisma.period.findMany({
    where: { userId },
    orderBy: { startDate: "desc" },
    take: limit,
    select: { id: true, startDate: true, endDate: true, notes: true },
  });
}

/**
 * Raw cycle history for the client-side calendar.
 *
 * The calendar recomputes predictions locally when the user changes month, so
 * it needs the underlying anchors rather than a pre-computed prediction.
 */
export async function getCycleHistory(
  userId: string,
  limit = 24,
): Promise<
  Array<{
    startDate: Date;
    endDate: Date | null;
    cycleLength: number | null;
    periodLength: number | null;
  }>
> {
  return prisma.cycle.findMany({
    where: { userId },
    orderBy: { startDate: "desc" },
    take: limit,
    select: {
      startDate: true,
      endDate: true,
      cycleLength: true,
      periodLength: true,
    },
  });
}

export async function getPeriodsInRange(
  userId: string,
  from: Date,
  to: Date,
): Promise<PeriodRow[]> {
  return prisma.period.findMany({
    where: {
      userId,
      // Include a period that started before the window but may have run into it.
      startDate: { lte: to },
      OR: [{ endDate: null }, { endDate: { gte: from } }],
    },
    orderBy: { startDate: "asc" },
    select: { id: true, startDate: true, endDate: true, notes: true },
  });
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, read: false } });
}

export async function getRecentNotifications(userId: string, take = 10) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      type: true,
      title: true,
      message: true,
      read: true,
      scheduledFor: true,
      createdAt: true,
    },
  });
}

// ---------------------------------------------------------------------------
// Pregnancy
// ---------------------------------------------------------------------------

export async function getActivePregnancy(userId: string) {
  return prisma.pregnancy.findFirst({
    where: { userId, active: true },
    orderBy: { startDate: "desc" },
    select: { id: true, startDate: true, dueDate: true, active: true },
  });
}

// ---------------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------------

export async function getReminders(userId: string) {
  return prisma.reminder.findMany({
    where: { userId },
    orderBy: { type: "asc" },
    select: {
      id: true,
      type: true,
      enabled: true,
      label: true,
      timeOfDay: true,
      leadTimeDays: true,
      scheduledAt: true,
    },
  });
}
