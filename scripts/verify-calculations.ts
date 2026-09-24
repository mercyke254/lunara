/**
 * Assertion suite for the cycle calculation engine.
 *
 * Run with:  npm run verify:calc
 *
 * The engine is deliberately pure, which makes it directly testable without a
 * database or a test framework. These assertions pin the behaviour that the UI
 * depends on - if one of them breaks, a dashboard reading is wrong.
 */

import assert from "node:assert/strict";
import {
  buildCyclePrediction,
  buildPhaseWindows,
  buildPredictedPeriodWindows,
  computeCycleStatistics,
  computeTrendSlope,
  deriveCycleLengths,
} from "../lib/calculations/cycle";
import { addDays, fromISODate, toISODate } from "../lib/dates";

let checks = 0;
function check(label: string, fn: () => void) {
  fn();
  checks += 1;
  console.log(`  ok  ${label}`);
}

const d = (iso: string): Date => {
  const parsed = fromISODate(iso);
  assert.ok(parsed, `fixture date ${iso} should parse`);
  return parsed;
};

const baseProfile = {
  averageCycleLength: 28,
  averagePeriodLength: 5,
  lastPeriodStart: null as Date | null,
  cycleRegularity: "UNKNOWN" as const,
};

console.log("\nLunara cycle engine\n");

// ---------------------------------------------------------------------------
check("date helpers round-trip as UTC day keys", () => {
  assert.equal(toISODate(d("2026-09-07")), "2026-09-07");
  assert.equal(toISODate(addDays(d("2026-12-31"), 1)), "2027-01-01");
  assert.equal(toISODate(addDays(d("2026-03-01"), -1)), "2026-02-28");
  assert.equal(fromISODate("2026-02-30"), null, "Feb 30 must not parse");
  assert.equal(fromISODate("07/09/2026"), null, "non-ISO format must not parse");
});

// ---------------------------------------------------------------------------
check("regular 28-day history yields a precise, high-confidence prediction", () => {
  const cycles = ["2026-06-01", "2026-06-29", "2026-07-27", "2026-08-24"].map((s) => ({
    startDate: d(s),
    endDate: addDays(d(s), 4),
    cycleLength: 28,
    periodLength: 5,
  }));

  const p = buildCyclePrediction({
    cycles,
    periods: cycles.map((c) => ({ startDate: c.startDate, endDate: c.endDate })),
    profile: baseProfile,
    today: d("2026-09-07"),
  });

  assert.deepEqual(p.observedCycleLengths, [28, 28, 28]);
  assert.equal(p.averageCycleLength, 28);
  assert.equal(p.regularity, "REGULAR");
  assert.equal(p.confidence, "high");
  assert.equal(p.variabilityDays, 0);

  // Last anchor 2026-08-24, so 2026-09-07 is cycle day 15.
  assert.equal(toISODate(p.currentCycleStart!), "2026-08-24");
  assert.equal(p.currentCycleDay, 15);
  assert.equal(p.cyclePhase, "OVULATION", "day 15 of 28 with a 14-day luteal phase");

  // Next period is one average cycle after the anchor; ovulation counts back 14.
  assert.equal(toISODate(p.nextPeriodStart!), "2026-09-21");
  assert.equal(p.daysUntilNextPeriod, 14);
  assert.equal(toISODate(p.ovulationDate!), "2026-09-07");
  assert.equal(p.daysUntilOvulation, 0);

  // Fertile window opens 5 days before ovulation and closes 1 day after.
  assert.equal(toISODate(p.fertileWindowStart!), "2026-09-02");
  assert.equal(toISODate(p.fertileWindowEnd!), "2026-09-08");

  assert.equal(p.isIrregular, false);
  assert.equal(p.isAwaitingPeriodLog, false);
  assert.equal(p.cyclesSinceLastLog, 0);
});

// ---------------------------------------------------------------------------
check("irregular history widens uncertainty and lowers confidence", () => {
  const starts = ["2026-01-01", "2026-01-25", "2026-03-01", "2026-03-27", "2026-04-29"];
  const cycles = starts.map((s) => ({
    startDate: d(s),
    endDate: null,
    cycleLength: null,
    periodLength: null,
  }));

  const p = buildCyclePrediction({
    cycles,
    periods: [],
    profile: baseProfile,
    today: d("2026-05-10"),
  });

  // Gaps: 24, 35, 26, 33 -> sd ~= 4.6
  assert.deepEqual(p.observedCycleLengths, [24, 35, 26, 33]);
  assert.ok(p.variabilityDays > 4, `expected sd > 4, got ${p.variabilityDays}`);
  assert.equal(p.regularity, "IRREGULAR");
  assert.equal(p.confidence, "low");
  assert.ok(p.uncertaintyDays >= 3, "irregular cycles must carry a wide error band");
  assert.equal(p.isIrregular, true);
  assert.ok(
    p.estimateNotice.includes("vary noticeably"),
    "estimate notice should acknowledge irregularity",
  );
});

// ---------------------------------------------------------------------------
check("no history falls back to the profile and admits low confidence", () => {
  const p = buildCyclePrediction({
    cycles: [],
    periods: [],
    profile: { ...baseProfile, averageCycleLength: 30, averagePeriodLength: 6, cycleRegularity: "REGULAR" },
    today: d("2026-09-07"),
  });

  assert.equal(p.basedOnCycles, 0);
  assert.equal(p.averageCycleLength, 30);
  assert.equal(p.averagePeriodLength, 6);
  assert.equal(p.lastPeriodStart, null);
  assert.equal(p.currentCycleDay, null);
  assert.equal(p.nextPeriodStart, null);
  assert.equal(p.cyclePhase, "UNKNOWN");
  assert.equal(p.confidence, "low");
  assert.equal(p.uncertaintyDays, 5);
});

// ---------------------------------------------------------------------------
check("stale data rolls the prediction forward instead of showing a past date", () => {
  const p = buildCyclePrediction({
    cycles: [{ startDate: d("2026-01-01"), endDate: null, cycleLength: null, periodLength: null }],
    periods: [],
    profile: baseProfile,
    today: d("2026-09-07"),
  });

  assert.ok(
    p.nextPeriodStart!.getTime() > d("2026-09-07").getTime(),
    "predicted next period must be in the future",
  );
  assert.equal(toISODate(p.nextPeriodStart!), "2026-09-10");
  assert.ok(p.cyclesSinceLastLog >= 8, "staleness should be counted in whole cycles");
  assert.equal(p.isAwaitingPeriodLog, true);
});

// ---------------------------------------------------------------------------
check("an open-ended recorded period only counts as ongoing for a plausible span", () => {
  const p = buildCyclePrediction({
    cycles: [],
    periods: [{ startDate: d("2026-09-05"), endDate: null }],
    profile: baseProfile,
    today: d("2026-09-07"),
  });
  assert.equal(p.isWithinRecordedPeriod, true);
  assert.equal(p.cyclePhase, "MENSTRUAL", "recorded bleeding overrides the phase estimate");

  const stale = buildCyclePrediction({
    cycles: [],
    periods: [{ startDate: d("2026-06-01"), endDate: null }],
    profile: baseProfile,
    today: d("2026-09-07"),
  });
  assert.equal(
    stale.isWithinRecordedPeriod,
    false,
    "a forgotten 'period ended' tap must not mark every later day as a period day",
  );
});

// ---------------------------------------------------------------------------
check("implausible gaps are excluded from the average", () => {
  // A 400-day gap is a data-entry error, not a cycle.
  const lengths = deriveCycleLengths(
    [
      { startDate: d("2024-01-01"), endDate: null, cycleLength: null, periodLength: null },
      { startDate: d("2025-02-04"), endDate: null, cycleLength: null, periodLength: null },
    ],
    [],
  );
  assert.deepEqual(lengths, [], "out-of-range gap must be discarded");

  const good = deriveCycleLengths(
    [
      { startDate: d("2026-01-01"), endDate: null, cycleLength: null, periodLength: null },
      { startDate: d("2026-01-29"), endDate: null, cycleLength: null, periodLength: null },
      { startDate: d("2026-02-26"), endDate: null, cycleLength: null, periodLength: null },
    ],
    [],
  );
  assert.deepEqual(good, [28, 28]);
});

// ---------------------------------------------------------------------------
check("trend slope detects lengthening, shortening, and stability", () => {
  assert.equal(computeTrendSlope([28, 30, 32]), 2);
  assert.equal(computeTrendSlope([32, 30, 28]), -2);
  assert.equal(computeTrendSlope([28, 28, 28, 28]), 0);
  assert.equal(computeTrendSlope([28, 29]), 0, "two points are not a trend");

  const stats = computeCycleStatistics({
    cycles: ["2026-01-01", "2026-01-29", "2026-02-28", "2026-03-31"].map((s) => ({
      startDate: d(s),
      endDate: null,
      cycleLength: null,
      periodLength: null,
    })),
    periods: [],
    profile: baseProfile,
  });
  assert.deepEqual(stats.lengths, [28, 30, 31]);
  assert.equal(stats.trendDirection, "LENGTHENING");
  assert.equal(stats.shortest, 28);
  assert.equal(stats.longest, 31);
});

// ---------------------------------------------------------------------------
check("phase windows cover a 28-day cycle without gaps or overlap", () => {
  const cycleStart = d("2026-09-01");
  const windows = buildPhaseWindows(cycleStart, 28, 5);

  const phases = windows.map((w) => w.phase);
  assert.deepEqual(phases, ["MENSTRUAL", "FOLLICULAR", "OVULATION", "LUTEAL"]);

  // Day-of-cycle for each boundary.
  const dayOf = (date: Date) => Math.round((date.getTime() - cycleStart.getTime()) / 86_400_000) + 1;
  assert.equal(dayOf(windows[0].start), 1);
  assert.equal(dayOf(windows[0].end), 5);
  assert.equal(dayOf(windows[1].start), 6);
  assert.equal(dayOf(windows[2].end), 16);
  assert.equal(dayOf(windows[3].end), 28);

  for (let i = 1; i < windows.length; i += 1) {
    const prevEnd = dayOf(windows[i - 1].end);
    const thisStart = dayOf(windows[i].start);
    assert.equal(thisStart, prevEnd + 1, `phase ${i} must start the day after the previous one ends`);
  }
});

// ---------------------------------------------------------------------------
check("calendar projections advance by one average cycle each time", () => {
  const p = buildCyclePrediction({
    cycles: ["2026-08-24"].map((s) => ({
      startDate: d(s),
      endDate: null,
      cycleLength: null,
      periodLength: null,
    })),
    periods: [],
    profile: baseProfile,
    today: d("2026-09-07"),
  });

  const windows = buildPredictedPeriodWindows(p, 3);
  assert.equal(windows.length, 3);
  assert.equal(toISODate(windows[0].start), "2026-09-21");
  assert.equal(toISODate(windows[0].end), "2026-09-25");
  assert.equal(toISODate(windows[1].start), "2026-10-19");
  assert.equal(toISODate(windows[2].start), "2026-11-16");
  assert.deepEqual(windows.map((w) => w.cycleIndex), [1, 2, 3]);
});

// ---------------------------------------------------------------------------
check("every prediction carries an estimate notice", () => {
  const cases = [
    { cycles: [], periods: [], profile: baseProfile },
    {
      cycles: [{ startDate: d("2026-08-24"), endDate: null, cycleLength: 28, periodLength: 5 }],
      periods: [],
      profile: baseProfile,
    },
  ];
  for (const c of cases) {
    const p = buildCyclePrediction({ ...c, today: d("2026-09-07") });
    assert.ok(p.estimateNotice.length > 0, "estimate notice must never be empty");
  }
});

console.log(`\n${checks} checks passed\n`);
