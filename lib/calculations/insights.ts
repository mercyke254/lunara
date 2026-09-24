import type {
  CyclePhase,
  CyclePrediction,
  CycleStatistics,
} from "@/lib/calculations/cycle";
import { PHASE_META, SYMPTOM_OPTIONS, MOOD_OPTIONS } from "@/lib/constants";
import { round } from "@/lib/utils";

/**
 * Plain-language explanation generators.
 *
 * DESIGN RULES (medical safety):
 *  1. Describe what the numbers show. Never explain why, and never suggest a
 *     cause, condition, or treatment.
 *  2. Never use diagnostic framing ("normal", "abnormal", "healthy",
 *     "concerning", "a sign of").
 *  3. When data is thin, say so instead of producing a confident-sounding
 *     sentence from two data points.
 *  4. Where a pattern might matter clinically, point to a professional rather
 *     than interpreting it.
 *
 * Every function returns a string safe to render verbatim.
 */

const SYMPTOM_LABELS = new Map(SYMPTOM_OPTIONS.map((o) => [o.value, o.label]));
const MOOD_LABELS = new Map(MOOD_OPTIONS.map((o) => [o.value, o.label]));

// ---------------------------------------------------------------------------
// Cycle length and regularity
// ---------------------------------------------------------------------------

export function describeCycleLength(stats: CycleStatistics): string {
  if (stats.dataPoints === 0) {
    return "No cycle lengths yet. Log two period starts and Lunara can measure the gap between them.";
  }
  if (stats.dataPoints === 1) {
    return `One cycle recorded so far, at ${stats.lengths[0]} days. A single cycle is not enough to describe a pattern.`;
  }

  const range =
    stats.shortest !== null && stats.longest !== null && stats.shortest !== stats.longest
      ? ` Your logged cycles have ranged from ${stats.shortest} to ${stats.longest} days.`
      : "";

  return `Across ${stats.dataPoints} logged cycles, your average cycle length is ${stats.averageLength} days.${range}`;
}

export function describeRegularity(stats: CycleStatistics): string {
  if (stats.dataPoints < 2) {
    return "Track a few more cycles and Lunara can describe how consistent yours tend to be.";
  }

  const variation = round(stats.variability, 1);

  switch (stats.regularity) {
    case "REGULAR":
      return `Your cycles vary by about ${variation} ${variation === 1 ? "day" : "days"} from one to the next, which is a consistent pattern. Predictions carry a narrow margin as a result.`;
    case "SOMEWHAT_IRREGULAR":
      return `Your cycles vary by about ${variation} days from one to the next. Lunara widens its predictions to reflect that, so treat estimated dates as a range rather than a fixed day.`;
    case "IRREGULAR":
      return `Your logged cycles vary by about ${variation} days, which is a wide spread. Predictions based on an average will often miss, and Lunara will say so rather than showing a single confident date. Cycle length that varies this much is worth discussing with a healthcare professional.`;
    default:
      return "Regularity will appear here once you have logged a couple of cycle lengths.";
  }
}

export function describeTrend(stats: CycleStatistics): string {
  switch (stats.trendDirection) {
    case "LENGTHENING":
      return `Your recent cycles have been longer than earlier ones — roughly ${Math.abs(stats.trendSlope)} days longer per cycle over the period you have logged. Trends like this are common and can be influenced by many everyday factors.`;
    case "SHORTENING":
      return `Your recent cycles have been shorter than earlier ones — roughly ${Math.abs(stats.trendSlope)} days shorter per cycle over the period you have logged. Trends like this are common and can be influenced by many everyday factors.`;
    case "STABLE":
      return "Your cycle length has stayed broadly steady across the cycles you have logged.";
    default:
      return "Three or more logged cycles are needed before Lunara will describe a trend.";
  }
}

export function describePeriodLength(stats: CycleStatistics): string {
  if (stats.averagePeriodLength <= 0) {
    return "No period durations recorded yet.";
  }
  return `Your periods have averaged ${stats.averagePeriodLength} days. If bleeding is consistently very heavy, lasts much longer than this, or appears between periods, that is worth raising with a healthcare professional.`;
}

// ---------------------------------------------------------------------------
// Current phase
// ---------------------------------------------------------------------------

export function describeCurrentPhase(prediction: CyclePrediction): string {
  if (prediction.currentCycleDay === null) {
    return "Log the first day of your most recent period and Lunara can place you in a cycle phase.";
  }

  const meta = PHASE_META[prediction.cyclePhase];
  const base = `${meta.summary}`;

  if (prediction.cyclePhase === "OVULATION") {
    return `${base} This is an estimate from your cycle dates — not a measurement.`;
  }
  if (prediction.isIrregular) {
    return `${base} Your cycles vary quite a bit, so this phase estimate could be off by several days.`;
  }
  return base;
}

/** One-line "what's next" phrasing used on the dashboard. */
export function describeUpcoming(prediction: CyclePrediction): string {
  if (prediction.daysUntilOvulation !== null && prediction.daysUntilOvulation >= 0 && prediction.daysUntilOvulation <= 5) {
    return prediction.daysUntilOvulation === 0
      ? "Estimated ovulation is today."
      : `Estimated ovulation in ${prediction.daysUntilOvulation} ${prediction.daysUntilOvulation === 1 ? "day" : "days"}.`;
  }

  if (prediction.daysUntilNextPeriod !== null) {
    if (prediction.daysUntilNextPeriod === 0) return "Your period is estimated to start today.";
    if (prediction.daysUntilNextPeriod < 0) {
      return "Your period is later than estimated. Logging a start date will bring your predictions back in line.";
    }
    return `Estimated next period in ${prediction.daysUntilNextPeriod} ${prediction.daysUntilNextPeriod === 1 ? "day" : "days"}.`;
  }

  return "Log a period to unlock predictions.";
}

export function describePhaseForCalendar(phase: CyclePhase): string {
  const meta = PHASE_META[phase];
  return `${meta.label}: ${meta.summary}`;
}

// ---------------------------------------------------------------------------
// Symptoms and mood
// ---------------------------------------------------------------------------

export function describeSymptoms(
  rows: Array<{ value: string; count: number; averageSeverity?: number }>,
  windowDays: number,
): string {
  if (rows.length === 0) {
    return `Nothing logged in the last ${windowDays} days. Symptoms you record will be summarised here, and eventually grouped by cycle phase.`;
  }

  const top = rows[0];
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const topLabel = SYMPTOM_LABELS.get(top.value as never) ?? top.value.toLowerCase();

  const severityNote =
    top.averageSeverity !== undefined
      ? ` You usually rate it around ${top.averageSeverity} out of 5.`
      : "";

  if (rows.length === 1) {
    return `You logged ${topLabel} on ${top.count} ${top.count === 1 ? "day" : "days"} in the last ${windowDays} days.${severityNote}`;
  }

  return `You logged ${total} symptoms across ${rows.length} types in the last ${windowDays} days. The most frequent was ${topLabel} (${top.count} ${top.count === 1 ? "day" : "days"}).${severityNote}`;
}

export function describeMood(rows: Array<{ value: string; count: number }>, windowDays: number): string {
  if (rows.length === 0) {
    return `No moods logged in the last ${windowDays} days. Mood entries appear here as a distribution.`;
  }

  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const top = rows[0];
  const topLabel = MOOD_LABELS.get(top.value as never) ?? top.value.toLowerCase();
  const share = Math.round((top.count / total) * 100);

  return `Across ${total} mood ${total === 1 ? "entry" : "entries"} in the last ${windowDays} days, ${topLabel} was the most common at ${share}% of them. Lunara shows the distribution rather than scoring your mood.`;
}

/**
 * Phase-correlated symptom observation.
 * Deliberately hedged: with small samples, a cluster can easily be coincidence.
 */
export function describeSymptomByPhase(
  rows: Array<{ symptom: string; byPhase: Record<string, number> }>,
): string {
  if (rows.length === 0) {
    return "Group symptoms by cycle phase to see whether anything clusters — this needs symptoms logged across at least a couple of cycles.";
  }

  const top = rows[0];
  const entries = Object.entries(top.byPhase).sort((a, b) => b[1] - a[1]);
  const [phase, count] = entries[0];
  const label = SYMPTOM_LABELS.get(top.symptom as never) ?? top.symptom.toLowerCase();

  if (!phase || count < 2) {
    return "Not enough entries yet to describe a phase pattern. A handful of days is not a pattern.";
  }

  const phaseLabel = PHASE_META[phase as CyclePhase]?.shortLabel.toLowerCase() ?? phase.toLowerCase();

  return `Your most logged symptom is ${label}, and it appears most often during your ${phaseLabel} phase (${count} ${count === 1 ? "day" : "days"}). This is an observation about what you recorded, not a medical finding — with a small number of entries it can easily be chance.`;
}

// ---------------------------------------------------------------------------
// Wellness
// ---------------------------------------------------------------------------

export function describeWellness(input: {
  averageSleep: number | null;
  averageWater: number | null;
  averageExerciseMinutes: number | null;
  averageEnergy: number | null;
  averageStress: number | null;
  entries: number;
}): string {
  if (input.entries === 0) {
    return "No wellness entries in this period yet.";
  }

  const parts: string[] = [];

  if (input.averageSleep !== null) {
    parts.push(`sleep averaging ${round(input.averageSleep, 1)} hours`);
  }
  if (input.averageWater !== null) {
    parts.push(`${Math.round(input.averageWater)} ml of water per day`);
  }
  if (input.averageExerciseMinutes !== null) {
    parts.push(`${Math.round(input.averageExerciseMinutes)} minutes of movement per day`);
  }
  if (input.averageEnergy !== null) {
    parts.push(`energy around ${round(input.averageEnergy, 1)} out of 5`);
  }
  if (input.averageStress !== null) {
    parts.push(`stress around ${round(input.averageStress, 1)} out of 5`);
  }

  if (parts.length === 0) return "Wellness entries exist but no values were recorded.";

  return `Across ${input.entries} ${input.entries === 1 ? "day" : "days"} with wellness entries: ${parts.join(", ")}. These are your own averages — Lunara does not score them or set targets.`;
}
