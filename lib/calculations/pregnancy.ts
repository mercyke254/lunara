import { addDays, daysBetween, toDateOnly } from "@/lib/dates";
import { clamp } from "@/lib/utils";
import { PREGNANCY_WEEK_HIGHLIGHTS, TRIMESTER_LABELS } from "@/lib/constants";

/**
 * Pregnancy dating.
 *
 * A pure module, like the cycle engine, so it can be reasoned about and tested
 * without a database.
 *
 * MEDICAL SAFETY: gestational age and due date are ESTIMATES derived from a
 * last menstrual period (or a clinician's dating scan). Only about 4% of babies
 * arrive on their estimated due date. Nothing here is a clinical measurement,
 * and the app must never present it as one.
 */

/** Naegele's rule: 280 days from the first day of the last menstrual period. */
export const GESTATION_DAYS = 280;

/** Ovulation is assumed at day 14 of a 28-day cycle. */
export const ASSUMED_OVULATION_DAY = 14;

export type Trimester = 1 | 2 | 3;

export interface PregnancyProgress {
  /** 1-based pregnancy week, matching how people normally talk ("week 24"). */
  week: number;
  /** Day within the current week, 0-6. */
  dayInWeek: number;
  /** Total days since the last menstrual period. */
  gestationalDays: number;
  /** Days until the estimated due date. Negative when past it. */
  daysRemaining: number;
  trimester: Trimester;
  trimesterLabel: string;
  /** 0-100, capped at 100. */
  progressPercent: number;
  lastPeriodStart: Date;
  dueDate: Date;
  /** Estimated conception date (LMP + 14), for context only. */
  estimatedConception: Date;
  /** End of the current trimester, or the due date in the third. */
  trimesterEnds: Date;
  /** True once the estimated due date has passed. */
  isPastDueDate: boolean;
  /** Weekly educational note. General information, not clinical advice. */
  weeklyHighlight: string;
  /** True before any gestational dating is possible. */
  isTooEarlyToDate: boolean;
}

export function estimateDueDateFromLmp(lastPeriodStart: Date): Date {
  return addDays(toDateOnly(lastPeriodStart), GESTATION_DAYS);
}

/** Reverse of the above, for users who know a clinician-provided due date. */
export function estimateLmpFromDueDate(dueDate: Date): Date {
  return addDays(toDateOnly(dueDate), -GESTATION_DAYS);
}

/** Weeks of gestation that a gestational age falls into. */
export function trimesterForWeek(week: number): Trimester {
  if (week <= 13) return 1;
  if (week <= 27) return 2;
  return 3;
}

/** Last day of the trimester containing `week`, as a gestational day count. */
function trimesterEndDay(trimester: Trimester): number {
  if (trimester === 1) return 13 * 7 + 6; // through 13w6d
  if (trimester === 2) return 27 * 7 + 6; // through 27w6d
  return GESTATION_DAYS;
}

export function computePregnancyProgress(input: {
  lastPeriodStart: Date;
  dueDate: Date;
  today: Date;
}): PregnancyProgress {
  const lastPeriodStart = toDateOnly(input.lastPeriodStart);
  const dueDate = toDateOnly(input.dueDate);
  const today = toDateOnly(input.today);

  const gestationalDays = daysBetween(lastPeriodStart, today);
  const daysRemaining = daysBetween(today, dueDate);

  // Before the LMP there is no meaningful dating to report.
  const isTooEarlyToDate = gestationalDays < 0;

  const week = clamp(Math.floor(gestationalDays / 7) + 1, 1, 45);
  const dayInWeek = clamp(gestationalDays % 7, 0, 6);
  const trimester = trimesterForWeek(week);
  const trimesterEnds = addDays(lastPeriodStart, trimesterEndDay(trimester));

  const progressPercent = clamp(
    Math.round((gestationalDays / GESTATION_DAYS) * 100),
    0,
    100,
  );

  return {
    week,
    dayInWeek,
    gestationalDays,
    daysRemaining,
    trimester,
    trimesterLabel: TRIMESTER_LABELS[trimester],
    progressPercent,
    lastPeriodStart,
    dueDate,
    estimatedConception: addDays(lastPeriodStart, ASSUMED_OVULATION_DAY),
    trimesterEnds,
    isPastDueDate: daysRemaining < 0,
    weeklyHighlight:
      PREGNANCY_WEEK_HIGHLIGHTS[week] ??
      "Every pregnancy progresses at its own pace. Your midwife or doctor is the right source for anything specific to you.",
    isTooEarlyToDate,
  };
}

export interface TimelineMilestone {
  label: string;
  date: Date;
  /** Gestational week this milestone corresponds to. */
  week: number;
  isPast: boolean;
}

/**
 * Milestone timeline.
 *
 * These are the conventional antenatal touchpoints. They are described as
 * "typically offered" rather than "you will have", because schedules differ by
 * country, provider, and individual circumstance.
 */
export function buildPregnancyTimeline(progress: PregnancyProgress): TimelineMilestone[] {
  const milestones: Array<{ label: string; week: number }> = [
    { label: "Dating scan is typically offered", week: 12 },
    { label: "Second trimester begins", week: 14 },
    { label: "Mid-pregnancy scan is typically offered", week: 20 },
    { label: "Third trimester begins", week: 28 },
    { label: "Antenatal appointments usually become more frequent", week: 32 },
    { label: "Birth preparations are usually discussed", week: 36 },
    { label: "Estimated due date", week: 40 },
  ];

  return milestones.map((milestone) => {
    // Milestone week N means N-1 completed weeks have elapsed.
    const date = addDays(progress.lastPeriodStart, (milestone.week - 1) * 7);
    return {
      ...milestone,
      date,
      isPast: date.getTime() <= addDays(progress.lastPeriodStart, progress.gestationalDays).getTime(),
    };
  });
}
