import { addDays, daysBetween, inclusiveDayCount, toDateOnly } from "@/lib/dates";
import { average, clamp, median, round, standardDeviation } from "@/lib/utils";
import type { CycleRegularity } from "@/lib/generated/prisma/enums";

/**
 * ============================================================================
 *  Lunara cycle calculation engine
 * ============================================================================
 *
 * This module is PURE: it takes plain data in and returns plain data out. It has
 * no database access, no React, and no locale formatting, so it can be unit
 * tested and reused. All presentation (colours, labels, copy) lives elsewhere.
 *
 * IMPORTANT - MEDICAL SAFETY
 * Every value here is a STATISTICAL ESTIMATE derived from the user's own logged
 * history and population-average phase lengths. It is not a diagnosis, not a
 * measurement, and not a guarantee. Ovulation and the fertile window in
 * particular cannot be determined from calendar arithmetic alone; they are
 * inferences. Consumers MUST present them as estimates (see `estimateNotice`)
 * and MUST NOT present them as contraception.
 */

export const CYCLE_CONSTANTS = {
  /** Fallback when the user has no history and gave no preference. */
  DEFAULT_CYCLE_LENGTH: 28,
  DEFAULT_PERIOD_LENGTH: 5,
  /**
   * Luteal phase assumption. The luteal phase is the most stable part of the
   * cycle (~12-14 days), so ovulation is estimated by counting BACK from the
   * predicted next period rather than forward from the last one.
   */
  LUTEAL_PHASE_LENGTH: 14,
  /** Sperm survival: fertile window opens ~5 days before ovulation. */
  FERTILE_DAYS_BEFORE_OVULATION: 5,
  /** Ovum viability: window closes ~1 day after ovulation. */
  FERTILE_DAYS_AFTER_OVULATION: 1,
  /** Plausibility bounds used to discard data-entry errors from averages. */
  MIN_PLAUSIBLE_CYCLE_LENGTH: 15,
  MAX_PLAUSIBLE_CYCLE_LENGTH: 90,
  MIN_PLAUSIBLE_PERIOD_LENGTH: 1,
  MAX_PLAUSIBLE_PERIOD_LENGTH: 14,
  /** How many future cycles the calendar will project. */
  MAX_FORWARD_CYCLES: 12,
} as const;

export type CyclePhase =
  | "MENSTRUAL"
  | "FOLLICULAR"
  | "OVULATION"
  | "LUTEAL"
  | "UNKNOWN";

export type PredictionConfidence = "low" | "medium" | "high";

export interface CycleHistoryEntry {
  startDate: Date;
  endDate: Date | null;
  cycleLength: number | null;
  periodLength: number | null;
}

export interface PeriodHistoryEntry {
  startDate: Date;
  endDate: Date | null;
}

export interface CycleProfileInput {
  averageCycleLength: number;
  averagePeriodLength: number;
  lastPeriodStart: Date | null;
  cycleRegularity: CycleRegularity;
}

export interface CyclePredictionInput {
  cycles: CycleHistoryEntry[];
  periods: PeriodHistoryEntry[];
  profile: CycleProfileInput;
  /** Reference "now" as a UTC-midnight day. Injectable for deterministic tests. */
  today: Date;
}

/** A date range with a role, used to paint the calendar. */
export interface PredictedWindow {
  start: Date;
  end: Date;
  /** 1-based index of the cycle this window belongs to relative to today. */
  cycleIndex: number;
}

export interface CyclePrediction {
  // --- observed statistics (from the user's own logs) ---
  observedCycleLengths: number[];
  basedOnCycles: number;
  averageCycleLength: number;
  medianCycleLength: number;
  shortestCycleLength: number | null;
  longestCycleLength: number | null;
  averagePeriodLength: number;
  /** Standard deviation of observed cycle lengths, in days. */
  variabilityDays: number;
  cycleLengthRangeDays: number;
  regularity: CycleRegularity;

  // --- current cycle ---
  lastPeriodStart: Date | null;
  currentCycleStart: Date | null;
  currentCycleDay: number | null;
  cyclePhase: CyclePhase;
  isWithinRecordedPeriod: boolean;

  // --- predictions (all ESTIMATES) ---
  nextPeriodStart: Date | null;
  nextPeriodEnd: Date | null;
  daysUntilNextPeriod: number | null;
  ovulationDate: Date | null;
  daysUntilOvulation: number | null;
  fertileWindowStart: Date | null;
  fertileWindowEnd: Date | null;

  // --- honesty about uncertainty ---
  /** +/- days of uncertainty to show alongside any predicted date. */
  uncertaintyDays: number;
  confidence: PredictionConfidence;
  isIrregular: boolean;
  /** True when today is past the predicted next period with no new log. */
  isAwaitingPeriodLog: boolean;
  /** Whole predicted cycles between the last log and today (stale-data guard). */
  cyclesSinceLastLog: number;
  estimateNotice: string;
}

export interface PhaseWindow {
  phase: CyclePhase;
  start: Date;
  end: Date;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function isPlausibleCycleLength(value: number): boolean {
  return (
    Number.isFinite(value) &&
    value >= CYCLE_CONSTANTS.MIN_PLAUSIBLE_CYCLE_LENGTH &&
    value <= CYCLE_CONSTANTS.MAX_PLAUSIBLE_CYCLE_LENGTH
  );
}

function isPlausiblePeriodLength(value: number): boolean {
  return (
    Number.isFinite(value) &&
    value >= CYCLE_CONSTANTS.MIN_PLAUSIBLE_PERIOD_LENGTH &&
    value <= CYCLE_CONSTANTS.MAX_PLAUSIBLE_PERIOD_LENGTH
  );
}

/**
 * Observed cycle lengths, derived from consecutive period start dates.
 *
 * Two sources, in order of trust:
 *  1. gap between consecutive cycle starts (the ground truth definition)
 *  2. a stored `cycleLength` on a cycle row (used when only one start exists)
 *
 * Either way the length is the interval from one period's first day to the next
 * period's first day, i.e. "cycle day 1 to the next cycle day 1".
 */
export function deriveCycleLengths(
  cycles: CycleHistoryEntry[],
  periods: PeriodHistoryEntry[],
): number[] {
  const anchors = new Set<number>();
  for (const c of cycles) anchors.add(toDateOnly(c.startDate).getTime());
  for (const p of periods) anchors.add(toDateOnly(p.startDate).getTime());

  const sorted = [...anchors].sort((a, b) => a - b).map((t) => new Date(t));

  const lengths: number[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = daysBetween(sorted[i - 1], sorted[i]);
    if (isPlausibleCycleLength(gap)) lengths.push(gap);
  }

  // Fall back to explicitly stored lengths when only one anchor exists.
  if (lengths.length === 0) {
    for (const c of cycles) {
      if (c.cycleLength && isPlausibleCycleLength(c.cycleLength)) {
        lengths.push(c.cycleLength);
      }
    }
  }

  return lengths;
}

/** Observed bleeding-episode durations. */
export function derivePeriodLengths(
  periods: PeriodHistoryEntry[],
  cycles: CycleHistoryEntry[],
): number[] {
  const lengths: number[] = [];

  for (const p of periods) {
    if (!p.endDate) continue;
    const days = inclusiveDayCount(p.startDate, p.endDate);
    if (isPlausiblePeriodLength(days)) lengths.push(days);
  }

  if (lengths.length === 0) {
    for (const c of cycles) {
      if (c.periodLength && isPlausiblePeriodLength(c.periodLength)) {
        lengths.push(c.periodLength);
      }
    }
  }

  return lengths;
}

/**
 * Classify cycle regularity from the spread of observed lengths.
 *
 * Uses standard deviation (the conventional "variation of more than 7-9 days
 * between cycles" guidance maps roughly onto sd > ~3.5 here):
 *   sd <= 2  -> REGULAR
 *   sd <= 4  -> SOMEWHAT_IRREGULAR
 *   sd >  4  -> IRREGULAR
 */
export function classifyRegularity(
  observedLengths: number[],
  fallback: CycleRegularity,
): CycleRegularity {
  if (observedLengths.length < 2) {
    // Not enough data to disagree with what the user told us at onboarding.
    return fallback;
  }
  const sd = standardDeviation(observedLengths);
  if (sd <= 2) return "REGULAR";
  if (sd <= 4) return "SOMEWHAT_IRREGULAR";
  return "IRREGULAR";
}

/**
 * Uncertainty band, in days, to attach to any predicted date.
 *
 * This is what stops the app from displaying false precision: the wider the
 * observed variation, the wider the band, and the lower the confidence.
 */
export function computeUncertainty(
  variabilityDays: number,
  regularity: CycleRegularity,
  basedOnCycles: number,
): number {
  if (basedOnCycles === 0) return 5;
  if (basedOnCycles === 1) return 4;

  if (regularity === "REGULAR") return clamp(Math.round(variabilityDays) + 1, 1, 3);
  if (regularity === "SOMEWHAT_IRREGULAR") {
    return clamp(Math.round(variabilityDays) + 1, 2, 5);
  }
  if (regularity === "IRREGULAR") {
    return clamp(Math.round(variabilityDays), 3, 9);
  }
  return 4;
}

function confidenceFrom(
  regularity: CycleRegularity,
  basedOnCycles: number,
  variabilityDays: number,
): PredictionConfidence {
  if (basedOnCycles >= 3 && regularity === "REGULAR" && variabilityDays <= 2) {
    return "high";
  }
  if (basedOnCycles >= 2 && (regularity === "REGULAR" || regularity === "SOMEWHAT_IRREGULAR")) {
    return "medium";
  }
  return "low";
}

/**
 * Which phase is `day` of the cycle in?
 *
 * `ovulationDay` is expressed as a cycle day so the comparison is like-for-like:
 *   ovulationDay = cycleLength - lutealLength + 1
 * e.g. a 28-day cycle with a 14-day luteal phase ovulates on day 15.
 */
export function phaseForCycleDay(
  cycleDay: number,
  effectivePeriodLength: number,
  effectiveCycleLength: number,
  ovulationDay: number,
): CyclePhase {
  if (cycleDay < 1) return "UNKNOWN";
  if (cycleDay <= effectivePeriodLength) return "MENSTRUAL";

  // Ovulation is a 3-day peak window (day before, day of, day after).
  if (Math.abs(cycleDay - ovulationDay) <= 1) return "OVULATION";
  if (cycleDay < ovulationDay) return "FOLLICULAR";

  // Past ovulation. Note this also covers a cycle that has overrun the
  // prediction (cycleDay > effectiveCycleLength): still the luteal phase, just
  // a long one - we surface that separately via `isAwaitingPeriodLog`.
  return "LUTEAL";
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function buildCyclePrediction(input: CyclePredictionInput): CyclePrediction {
  const today = toDateOnly(input.today);
  const { cycles, periods, profile } = input;

  // ---- 1. Observed statistics -------------------------------------------
  const observedCycleLengths = deriveCycleLengths(cycles, periods);
  const observedPeriodLengths = derivePeriodLengths(periods, cycles);

  const hasObserved = observedCycleLengths.length > 0;

  const averageCycleLength = Math.round(
    clamp(
      hasObserved
        ? average(observedCycleLengths)
        : isPlausibleCycleLength(profile.averageCycleLength)
          ? profile.averageCycleLength
          : CYCLE_CONSTANTS.DEFAULT_CYCLE_LENGTH,
      CYCLE_CONSTANTS.MIN_PLAUSIBLE_CYCLE_LENGTH,
      CYCLE_CONSTANTS.MAX_PLAUSIBLE_CYCLE_LENGTH,
    ),
  );

  const averagePeriodLength = Math.round(
    clamp(
      observedPeriodLengths.length > 0
        ? average(observedPeriodLengths)
        : isPlausiblePeriodLength(profile.averagePeriodLength)
          ? profile.averagePeriodLength
          : CYCLE_CONSTANTS.DEFAULT_PERIOD_LENGTH,
      CYCLE_CONSTANTS.MIN_PLAUSIBLE_PERIOD_LENGTH,
      CYCLE_CONSTANTS.MAX_PLAUSIBLE_PERIOD_LENGTH,
    ),
  );

  const variabilityDays = round(standardDeviation(observedCycleLengths), 1);
  const shortestCycleLength =
    observedCycleLengths.length > 0 ? Math.min(...observedCycleLengths) : null;
  const longestCycleLength =
    observedCycleLengths.length > 0 ? Math.max(...observedCycleLengths) : null;
  const cycleLengthRangeDays =
    shortestCycleLength !== null && longestCycleLength !== null
      ? longestCycleLength - shortestCycleLength
      : 0;

  const regularity = classifyRegularity(
    observedCycleLengths,
    profile.cycleRegularity,
  );
  const isIrregular =
    regularity === "IRREGULAR" || regularity === "SOMEWHAT_IRREGULAR";

  // ---- 2. Anchor: the most recent period start --------------------------
  const periodStarts = [
    ...periods.map((p) => toDateOnly(p.startDate)),
    ...cycles.map((c) => toDateOnly(c.startDate)),
  ];
  if (profile.lastPeriodStart) {
    periodStarts.push(toDateOnly(profile.lastPeriodStart));
  }
  // Ignore anchors in the future - a future "period start" is a plan, not data.
  const pastStarts = periodStarts
    .filter((d) => d.getTime() <= today.getTime())
    .sort((a, b) => b.getTime() - a.getTime());

  const lastPeriodStart = pastStarts[0] ?? null;
  const currentCycleStart = lastPeriodStart;

  const currentCycleDay =
    currentCycleStart !== null
      ? daysBetween(currentCycleStart, today) + 1
      : null;

  // ---- 3. Predictions ---------------------------------------------------
  let nextPeriodStart: Date | null = null;
  let cyclesSinceLastLog = 0;

  if (currentCycleStart) {
    // Walk forward from the last anchor until we land strictly after today, so
    // stale data still yields a sensible upcoming estimate instead of a date in
    // the past. The number of hops is itself a staleness signal.
    let candidate = addDays(currentCycleStart, averageCycleLength);
    let hops = 0;
    while (candidate.getTime() <= today.getTime() && hops < CYCLE_CONSTANTS.MAX_FORWARD_CYCLES) {
      candidate = addDays(candidate, averageCycleLength);
      hops += 1;
    }
    cyclesSinceLastLog = hops;
    nextPeriodStart = candidate;
  }

  const nextPeriodEnd = nextPeriodStart
    ? addDays(nextPeriodStart, averagePeriodLength - 1)
    : null;

  const daysUntilNextPeriod = nextPeriodStart
    ? daysBetween(today, nextPeriodStart)
    : null;

  // Ovulation is derived by counting BACK from the predicted next period, which
  // is more robust than counting forward from the last one.
  const ovulationDate = nextPeriodStart
    ? addDays(nextPeriodStart, -CYCLE_CONSTANTS.LUTEAL_PHASE_LENGTH)
    : null;

  const daysUntilOvulation = ovulationDate
    ? daysBetween(today, ovulationDate)
    : null;

  const fertileWindowStart = ovulationDate
    ? addDays(ovulationDate, -CYCLE_CONSTANTS.FERTILE_DAYS_BEFORE_OVULATION)
    : null;

  const fertileWindowEnd = ovulationDate
    ? addDays(ovulationDate, CYCLE_CONSTANTS.FERTILE_DAYS_AFTER_OVULATION)
    : null;

  // ---- 4. Current phase -------------------------------------------------
  let cyclePhase: CyclePhase = "UNKNOWN";
  if (currentCycleDay !== null) {
    const ovulationDay = averageCycleLength - CYCLE_CONSTANTS.LUTEAL_PHASE_LENGTH + 1;
    cyclePhase = phaseForCycleDay(
      currentCycleDay,
      averagePeriodLength,
      averageCycleLength,
      ovulationDay,
    );
  }

  // A recorded bleeding episode is stronger evidence than the prediction.
  const isWithinRecordedPeriod = periods.some((p) => {
    const todayMs = today.getTime();
    if (todayMs < toDateOnly(p.startDate).getTime()) return false;
    if (!p.endDate) {
      // Open-ended episode: treat as ongoing only up to a plausible maximum
      // duration, so a forgotten "period ended" tap does not paint every
      // subsequent day as a period day forever.
      return daysBetween(p.startDate, today) < CYCLE_CONSTANTS.MAX_PLAUSIBLE_PERIOD_LENGTH;
    }
    return todayMs <= toDateOnly(p.endDate).getTime();
  });
  if (isWithinRecordedPeriod) cyclePhase = "MENSTRUAL";

  // ---- 5. Honesty about uncertainty ------------------------------------
  const uncertaintyDays = computeUncertainty(
    variabilityDays,
    regularity,
    observedCycleLengths.length,
  );

  const confidence = confidenceFrom(
    regularity,
    observedCycleLengths.length,
    variabilityDays,
  );

  const isAwaitingPeriodLog =
    currentCycleDay !== null && currentCycleDay > averageCycleLength;

  const estimateNotice =
    confidence === "high"
      ? `Based on ${observedCycleLengths.length} logged cycles. Still an estimate - your body may vary.`
      : observedCycleLengths.length === 0
        ? "Based on the details you shared at sign-up. Log a few cycles to make this more accurate."
        : `Based on ${observedCycleLengths.length} logged ${observedCycleLengths.length === 1 ? "cycle" : "cycles"}${
            isIrregular ? ", which vary noticeably in length" : ""
          }. Estimates may be off by around ${uncertaintyDays} ${uncertaintyDays === 1 ? "day" : "days"}.`;

  return {
    observedCycleLengths,
    basedOnCycles: observedCycleLengths.length,
    averageCycleLength,
    medianCycleLength:
      observedCycleLengths.length > 0 ? Math.round(median(observedCycleLengths)) : averageCycleLength,
    shortestCycleLength,
    longestCycleLength,
    averagePeriodLength,
    variabilityDays,
    cycleLengthRangeDays,
    regularity,

    lastPeriodStart,
    currentCycleStart,
    currentCycleDay,
    cyclePhase,
    isWithinRecordedPeriod,

    nextPeriodStart,
    nextPeriodEnd,
    daysUntilNextPeriod,
    ovulationDate,
    daysUntilOvulation,
    fertileWindowStart,
    fertileWindowEnd,

    uncertaintyDays,
    confidence,
    isIrregular,
    isAwaitingPeriodLog,
    cyclesSinceLastLog,
    estimateNotice,
  };
}

// ---------------------------------------------------------------------------
// Calendar projections
// ---------------------------------------------------------------------------

/** Project upcoming period windows for the calendar. */
export function buildPredictedPeriodWindows(
  prediction: CyclePrediction,
  count = 6,
): PredictedWindow[] {
  if (!prediction.nextPeriodStart) return [];
  const capped = clamp(count, 1, CYCLE_CONSTANTS.MAX_FORWARD_CYCLES);
  const windows: PredictedWindow[] = [];

  for (let i = 0; i < capped; i += 1) {
    const start = addDays(prediction.nextPeriodStart, i * prediction.averageCycleLength);
    const end = addDays(start, prediction.averagePeriodLength - 1);
    windows.push({ start, end, cycleIndex: i + 1 });
  }
  return windows;
}

/** Project upcoming fertile windows for the calendar. */
export function buildPredictedFertileWindows(
  prediction: CyclePrediction,
  count = 6,
): PredictedWindow[] {
  if (!prediction.ovulationDate) return [];
  const capped = clamp(count, 1, CYCLE_CONSTANTS.MAX_FORWARD_CYCLES);
  const windows: PredictedWindow[] = [];

  for (let i = 0; i < capped; i += 1) {
    const offset = i * prediction.averageCycleLength;
    const ovulation = addDays(prediction.ovulationDate, offset);
    windows.push({
      start: addDays(ovulation, -CYCLE_CONSTANTS.FERTILE_DAYS_BEFORE_OVULATION),
      end: addDays(ovulation, CYCLE_CONSTANTS.FERTILE_DAYS_AFTER_OVULATION),
      cycleIndex: i + 1,
    });
  }
  return windows;
}

/**
 * Phase boundaries for a given cycle, used by the calendar's phase band and the
 * insights screen.
 */
export function buildPhaseWindows(
  cycleStart: Date,
  cycleLength: number,
  periodLength: number,
): PhaseWindow[] {
  const ovulationDay = cycleLength - CYCLE_CONSTANTS.LUTEAL_PHASE_LENGTH + 1;
  const windows: PhaseWindow[] = [];

  windows.push({
    phase: "MENSTRUAL",
    start: cycleStart,
    end: addDays(cycleStart, Math.max(0, periodLength - 1)),
  });

  const follicularStart = addDays(cycleStart, periodLength);
  const follicularEnd = addDays(cycleStart, Math.max(periodLength, ovulationDay - 2));
  if (follicularEnd.getTime() >= follicularStart.getTime()) {
    windows.push({ phase: "FOLLICULAR", start: follicularStart, end: follicularEnd });
  }

  windows.push({
    phase: "OVULATION",
    start: addDays(cycleStart, Math.max(periodLength, ovulationDay - 1)),
    end: addDays(cycleStart, ovulationDay),
  });

  const lutealStart = addDays(cycleStart, ovulationDay + 1);
  const lutealEnd = addDays(cycleStart, cycleLength - 1);
  if (lutealEnd.getTime() >= lutealStart.getTime()) {
    windows.push({ phase: "LUTEAL", start: lutealStart, end: lutealEnd });
  }

  return windows;
}

// ---------------------------------------------------------------------------
// Insights statistics
// ---------------------------------------------------------------------------

export interface CycleStatistics {
  lengths: number[];
  averageLength: number;
  medianLength: number;
  shortest: number | null;
  longest: number | null;
  variability: number;
  averagePeriodLength: number;
  regularity: CycleRegularity;
  /** Least-squares slope in days per cycle. Positive = cycles lengthening. */
  trendSlope: number;
  trendDirection: "LENGTHENING" | "SHORTENING" | "STABLE" | "INSUFFICIENT_DATA";
  dataPoints: number;
}

/**
 * Least-squares slope of cycle length over time. Used only to say "your cycles
 * have been getting slightly longer/shorter" - never to imply a cause.
 */
export function computeTrendSlope(lengths: number[]): number {
  const n = lengths.length;
  if (n < 3) return 0;
  const meanX = (n - 1) / 2;
  const meanY = average(lengths);
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i += 1) {
    numerator += (i - meanX) * (lengths[i] - meanY);
    denominator += (i - meanX) ** 2;
  }
  if (denominator === 0) return 0;
  return round(numerator / denominator, 2);
}

export function computeCycleStatistics(input: {
  cycles: CycleHistoryEntry[];
  periods: PeriodHistoryEntry[];
  profile: CycleProfileInput;
}): CycleStatistics {
  const lengths = deriveCycleLengths(input.cycles, input.periods);
  const periodLengths = derivePeriodLengths(input.periods, input.cycles);
  const trendSlope = computeTrendSlope(lengths);

  let trendDirection: CycleStatistics["trendDirection"] = "INSUFFICIENT_DATA";
  if (lengths.length >= 3) {
    if (trendSlope >= 0.5) trendDirection = "LENGTHENING";
    else if (trendSlope <= -0.5) trendDirection = "SHORTENING";
    else trendDirection = "STABLE";
  }

  return {
    lengths,
    averageLength:
      lengths.length > 0
        ? Math.round(average(lengths))
        : input.profile.averageCycleLength,
    medianLength:
      lengths.length > 0
        ? Math.round(median(lengths))
        : input.profile.averageCycleLength,
    shortest: lengths.length > 0 ? Math.min(...lengths) : null,
    longest: lengths.length > 0 ? Math.max(...lengths) : null,
    variability: round(standardDeviation(lengths), 1),
    averagePeriodLength:
      periodLengths.length > 0
        ? Math.round(average(periodLengths) * 10) / 10
        : input.profile.averagePeriodLength,
    regularity: classifyRegularity(lengths, input.profile.cycleRegularity),
    trendSlope,
    trendDirection,
    dataPoints: lengths.length,
  };
}
