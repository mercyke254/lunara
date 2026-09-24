"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import {
  PeriodEditorDialog,
  type ExistingPeriod,
} from "@/components/calendar/period-editor-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EstimateNote } from "@/components/shared/estimate-note";
import {
  addDays,
  addMonths,
  eachDay,
  formatMonthYear,
  fromISODate,
  isSameDay,
  monthGrid,
  startOfMonth,
  toISODate,
  today as todayFn,
  WEEKDAY_LABELS,
} from "@/lib/dates";
import {
  buildCyclePrediction,
  buildPredictedFertileWindows,
  buildPredictedPeriodWindows,
  type CycleHistoryEntry,
  type PeriodHistoryEntry,
} from "@/lib/calculations/cycle";
import { cn } from "@/lib/utils";
import type { CycleRegularity } from "@/lib/generated/prisma/enums";

/**
 * Interactive period calendar.
 *
 * The whole month model is derived on the client from the raw period and cycle
 * history the server passes in. That avoids a round trip when the user pages
 * between months, and it guarantees the calendar uses the exact same calculation
 * engine as the dashboard and insights screens (the engine is a pure module, so
 * importing it into a Client Component is safe and adds no data access).
 *
 * Rendered as a real ARIA grid of buttons so every day is reachable and
 * announced by keyboard and screen reader, with a text status in the label
 * rather than relying on colour.
 */

const MAX_FORWARD_CYCLES = 12;

type DayStatus = "recorded" | "predicted" | "fertile" | "ovulation" | "none";

export interface CalendarProps {
  /** Recorded periods, newest first. */
  periods: ExistingPeriod[];
  cycles: CycleHistoryEntry[];
  /** Today, pre-resolved on the server so the first paint is deterministic. */
  todayIso: string;
  averageCycleLength: number;
  averagePeriodLength: number;
  cycleRegularity: CycleRegularity;
  lastPeriodStart: Date | null;
}

export function PeriodCalendar({
  periods,
  cycles,
  todayIso,
  averageCycleLength,
  averagePeriodLength,
  cycleRegularity,
  lastPeriodStart,
}: CalendarProps) {
  const todayDate = fromISODate(todayIso) ?? todayFn();

  const [month, setMonth] = useState<Date>(() => startOfMonth(todayDate));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // ---- Prediction model (pure, recomputed from history) -----------------
  const model = useMemo(() => {
    const periodEntries: PeriodHistoryEntry[] = periods.map((p) => ({
      startDate: p.startDate,
      endDate: p.endDate,
    }));

    const prediction = buildCyclePrediction({
      cycles,
      periods: periodEntries,
      profile: {
        averageCycleLength,
        averagePeriodLength,
        lastPeriodStart,
        cycleRegularity,
      },
      today: todayDate,
    });

    return {
      prediction,
      predictedPeriods: buildPredictedPeriodWindows(prediction, MAX_FORWARD_CYCLES),
      fertileWindows: buildPredictedFertileWindows(prediction, MAX_FORWARD_CYCLES),
    };
  }, [
    periods,
    cycles,
    averageCycleLength,
    averagePeriodLength,
    lastPeriodStart,
    cycleRegularity,
    todayDate,
  ]);

  const { prediction, predictedPeriods, fertileWindows } = model;

  const grid = useMemo(() => monthGrid(month), [month]);

  /**
   * Recorded period days for the visible month.
   *
   * An open-ended period is painted for a plausible maximum duration only, so a
   * forgotten "period ended" tap does not mark the rest of the calendar forever.
   */
  const recordedDays = useMemo(() => {
    const set = new Set<string>();
    for (const period of periods) {
      const start = period.startDate;
      const naturalEnd = addDays(start, Math.max(0, averagePeriodLength - 1));
      const boundedEnd = period.endDate ?? (naturalEnd.getTime() > todayDate.getTime() ? todayDate : naturalEnd);
      for (const day of eachDay(start, boundedEnd)) {
        set.add(toISODate(day));
      }
    }
    return set;
  }, [periods, averagePeriodLength, todayDate]);

  const predictedDays = useMemo(() => {
    const set = new Set<string>();
    for (const window of predictedPeriods) {
      for (const day of eachDay(window.start, window.end)) set.add(toISODate(day));
    }
    return set;
  }, [predictedPeriods]);

  const fertileDays = useMemo(() => {
    const set = new Set<string>();
    for (const window of fertileWindows) {
      for (const day of eachDay(window.start, window.end)) set.add(toISODate(day));
    }
    return set;
  }, [fertileWindows]);

  const ovulationDays = useMemo(() => {
    const set = new Set<string>();
    if (!prediction.ovulationDate) return set;
    // The fertile windows repeat each cycle, so derive each ovulation day from
    // the window they were built around (end - 1 day).
    for (const window of fertileWindows) {
      set.add(toISODate(addDays(window.end, -1)));
    }
    return set;
  }, [fertileWindows, prediction.ovulationDate]);

  function statusFor(day: Date): DayStatus {
    const key = toISODate(day);
    if (recordedDays.has(key)) return "recorded";
    if (ovulationDays.has(key)) return "ovulation";
    if (fertileDays.has(key)) return "fertile";
    if (predictedDays.has(key)) return "predicted";
    return "none";
  }

  const STATUS_LABEL: Record<DayStatus, string> = {
    recorded: "recorded period day",
    ovulation: "estimated ovulation",
    fertile: "estimated fertile window",
    predicted: "predicted period day",
    none: "no entry",
  };

  const STATUS_CLASS: Record<DayStatus, string> = {
    recorded: "bg-[var(--phase-menstrual)] text-white font-semibold hover:brightness-105",
    ovulation: "bg-[var(--phase-ovulation)] text-white font-semibold hover:brightness-105",
    fertile:
      "bg-[color-mix(in_oklab,var(--phase-follicular)_24%,transparent)] text-[var(--secondary-foreground)] hover:bg-[color-mix(in_oklab,var(--phase-follicular)_32%,transparent)]",
    predicted:
      "bg-[color-mix(in_oklab,var(--phase-menstrual)_14%,transparent)] text-[var(--phase-menstrual)] ring-1 ring-inset ring-[color-mix(in_oklab,var(--phase-menstrual)_40%,transparent)] hover:bg-[color-mix(in_oklab,var(--phase-menstrual)_22%,transparent)]",
    none: "text-muted-foreground hover:bg-muted",
  };

  // Recorded periods that overlap the visible month, for the detail list.
  const periodsThisMonth = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = addDays(addMonths(monthStart, 1), -1);
    return periods.filter((period) => {
      const effectiveEnd = period.endDate ?? period.startDate;
      return (
        period.startDate.getTime() <= monthEnd.getTime() &&
        effectiveEnd.getTime() >= monthStart.getTime()
      );
    });
  }, [periods, month]);

  const hasOpenPeriod = periods.some((p) => p.endDate === null);

  const selectedPeriod = selectedDate
    ? (periods.find((p) => toISODate(p.startDate) === selectedDate) ?? null)
    : null;

  return (
    <div className="space-y-5">
      {/* --- Month navigation ------------------------------------------- */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="iconSm"
          onClick={() => setMonth((m) => addMonths(m, -1))}
          aria-label="Previous month"
        >
          <ChevronLeft aria-hidden="true" />
        </Button>

        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-lg font-semibold" aria-live="polite">
            {formatMonthYear(month)}
          </h2>
          <button
            type="button"
            onClick={() => setMonth(startOfMonth(todayDate))}
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Today
          </button>
        </div>

        <Button
          variant="outline"
          size="iconSm"
          onClick={() => setMonth((m) => addMonths(m, 1))}
          aria-label="Next month"
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>

      {/* --- Grid -------------------------------------------------------- */}
      <div role="grid" aria-label={`Calendar for ${formatMonthYear(month)}`}>
        <div role="row" className="grid grid-cols-7 gap-1 pb-1">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              role="columnheader"
              className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              <span aria-hidden="true">{label.charAt(0)}</span>
              <span className="sr-only">{label}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {grid.map((day) => {
            const inMonth = day.getUTCMonth() === month.getUTCMonth();
            const status = statusFor(day);
            const isToday = isSameDay(day, todayDate);
            const iso = toISODate(day);

            return (
              <button
                key={iso}
                type="button"
                role="gridcell"
                onClick={() => {
                  setSelectedDate(iso);
                  setDialogOpen(true);
                }}
                aria-label={`${iso}, ${STATUS_LABEL[status]}${isToday ? ", today" : ""}. Activate to add or edit.`}
                aria-current={isToday ? "date" : undefined}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-xl text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  STATUS_CLASS[status],
                  !inMonth && "opacity-35",
                  isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                )}
              >
                {day.getUTCDate()}
              </button>
            );
          })}
        </div>
      </div>

      {/* --- Legend ------------------------------------------------------ */}
      <ul className="grid grid-cols-2 gap-2 border-t border-border pt-4 sm:grid-cols-4">
        {[
          { label: "Recorded period", swatch: "bg-[var(--phase-menstrual)]" },
          { label: "Predicted period", swatch: "bg-[color-mix(in_oklab,var(--phase-menstrual)_22%,transparent)] ring-1 ring-[color-mix(in_oklab,var(--phase-menstrual)_45%,transparent)]" },
          { label: "Estimated fertile window", swatch: "bg-[color-mix(in_oklab,var(--phase-follicular)_40%,transparent)]" },
          { label: "Estimated ovulation", swatch: "bg-[var(--phase-ovulation)]" },
        ].map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn("size-3 shrink-0 rounded-full", item.swatch)} aria-hidden="true" />
            {item.label}
          </li>
        ))}
      </ul>

      {/* --- Recorded entries for this month ---------------------------- */}
      <div className="space-y-2 border-t border-border pt-4">
        <h3 className="text-sm font-semibold">
          Recorded this month
        </h3>

        {periodsThisMonth.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing recorded in {formatMonthYear(month)}. Tap any day to add an
            entry.
          </p>
        ) : (
          <ul className="space-y-2">
            {periodsThisMonth.map((period) => (
              <li
                key={period.id}
                className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-muted/40 px-3.5 py-2.5"
              >
                <Badge variant="rose" className="font-normal">
                  {toISODate(period.startDate).slice(5)}
                  {period.endDate ? ` → ${toISODate(period.endDate).slice(5)}` : " → ongoing"}
                </Badge>
                {period.notes ? (
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {period.notes}
                  </span>
                ) : (
                  <span className="flex-1" />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedDate(toISODate(period.startDate));
                    setDialogOpen(true);
                  }}
                >
                  <Pencil aria-hidden="true" />
                  Edit
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <EstimateNote text={prediction.estimateNotice} />

      {/* --- Editor ------------------------------------------------------ */}
      {selectedDate ? (
        <PeriodEditorDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          date={selectedDate}
          existingPeriod={selectedPeriod}
          hasOpenPeriod={hasOpenPeriod}
        />
      ) : null}
    </div>
  );
}
