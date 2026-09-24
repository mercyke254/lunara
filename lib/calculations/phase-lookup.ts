import { toDateOnly, daysBetween } from "@/lib/dates";
import {
  CYCLE_CONSTANTS,
  classifyRegularity,
  deriveCycleLengths,
  phaseForCycleDay,
  type CyclePhase,
} from "@/lib/calculations/cycle";

/**
 * Historical phase attribution.
 *
 * The main prediction engine answers "what phase is the user in NOW?". Charting
 * symptom-by-phase needs a different question answered: "what phase was the user
 * in on THIS PAST date?". Calendar arithmetic must therefore be anchored to the
 * cycle that was actually running on that date, using the user's logged history
 * rather than a projection from today.
 *
 * Kept in its own module so `cycle.ts` stays a pure forward-looking engine and
 * this stays a pure backward-looking one.
 */

export interface PhaseLookupInput {
  cycles: Array<{ startDate: Date; endDate: Date | null; cycleLength: number | null; periodLength: number | null }>;
  periods: Array<{ startDate: Date; endDate: Date | null }>;
}

/**
 * Which phase was active on `date`?
 *
 * Returns UNKNOWN for dates before any logged cycle, which is honest: Lunara has
 * no basis for attributing a phase to a period it never observed.
 */
export function phaseForDate(date: Date, input: PhaseLookupInput): CyclePhase {
  const target = toDateOnly(date);

  // Anchors: every recorded period/cycle start, ascending.
  const anchors = [
    ...input.periods.map((p) => toDateOnly(p.startDate)),
    ...input.cycles.map((c) => toDateOnly(c.startDate)),
  ].sort((a, b) => a.getTime() - b.getTime());

  if (anchors.length === 0) return "UNKNOWN";

  // Ignore anchors that start after the date we are asking about.
  const prior = anchors.filter((a) => a.getTime() <= target.getTime());
  if (prior.length === 0) return "UNKNOWN";

  const cycleStart = prior[prior.length - 1];
  const cycleDay = daysBetween(cycleStart, target) + 1;

  const observedLengths = deriveCycleLengths(input.cycles, input.periods);
  const cycleLength =
    observedLengths.length > 0
      ? Math.round(
          observedLengths.reduce((sum, v) => sum + v, 0) / observedLengths.length,
        )
      : CYCLE_CONSTANTS.DEFAULT_CYCLE_LENGTH;

  const periodLength =
    input.cycles.find((c) => c.periodLength)?.periodLength ??
    CYCLE_CONSTANTS.DEFAULT_PERIOD_LENGTH;

  const ovulationDay = cycleLength - CYCLE_CONSTANTS.LUTEAL_PHASE_LENGTH + 1;

  return phaseForCycleDay(cycleDay, periodLength, cycleLength, ovulationDay);
}

/**
 * Phase buckets used by the insights charts.
 * A stable, ordered list, so chart series and legends never reorder.
 */
export const PHASE_ORDER: CyclePhase[] = [
  "MENSTRUAL",
  "FOLLICULAR",
  "OVULATION",
  "LUTEAL",
];

/** Regularity of the user's history, for the insight sentence. */
export function historicalRegularity(input: PhaseLookupInput) {
  return classifyRegularity(deriveCycleLengths(input.cycles, input.periods), "UNKNOWN");
}
