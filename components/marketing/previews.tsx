import { Droplet, Footprints, Moon, Smile } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Product previews for the landing page.
 *
 * These are deliberately STATIC and hand-built from SVG/CSS rather than live
 * widgets: the marketing page must render on the server with no client
 * JavaScript, no database access, and no dependence on the current date. Using
 * a hard-coded exemplar month also keeps the prerendered HTML deterministic.
 *
 * Each preview is illustrative sample data, and each one is labelled as such so
 * nobody mistakes it for their own tracked information.
 */

// ---------------------------------------------------------------------------
// Period calendar
// ---------------------------------------------------------------------------

/** An exemplar month. Fixed so prerendering is deterministic. */
const DEMO_MONTH = "September 2026";
const DEMO_WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

type DayKind = "period" | "predicted" | "fertile" | "ovulation" | "plain";
const DEMO_DAYS: { day: number | null; kind: DayKind }[] = [
  // A 42-cell Monday-first grid: 2 leading blanks, 30 days, 10 trailing blanks.
  { day: null, kind: "plain" },
  { day: null, kind: "plain" },
  { day: 1, kind: "period" },
  { day: 2, kind: "period" },
  { day: 3, kind: "period" },
  { day: 4, kind: "period" },
  { day: 5, kind: "period" },
  { day: 6, kind: "plain" },
  { day: 7, kind: "plain" },
  { day: 8, kind: "plain" },
  { day: 9, kind: "plain" },
  { day: 10, kind: "plain" },
  { day: 11, kind: "fertile" },
  { day: 12, kind: "fertile" },
  { day: 13, kind: "fertile" },
  { day: 14, kind: "fertile" },
  { day: 15, kind: "ovulation" },
  { day: 16, kind: "fertile" },
  { day: 17, kind: "plain" },
  { day: 18, kind: "plain" },
  { day: 19, kind: "plain" },
  { day: 20, kind: "plain" },
  { day: 21, kind: "plain" },
  { day: 22, kind: "plain" },
  { day: 23, kind: "plain" },
  { day: 24, kind: "plain" },
  { day: 25, kind: "plain" },
  { day: 26, kind: "plain" },
  { day: 27, kind: "predicted" },
  { day: 28, kind: "predicted" },
  { day: 29, kind: "predicted" },
  { day: 30, kind: "predicted" },
  ...Array.from({ length: 10 }, () => ({ day: null, kind: "plain" as DayKind })),
];

const DAY_STYLES: Record<DayKind, string> = {
  period: "bg-[var(--phase-menstrual)] text-white font-semibold",
  predicted:
    "bg-[color-mix(in_oklab,var(--phase-menstrual)_18%,transparent)] text-[var(--phase-menstrual)] ring-1 ring-inset ring-[color-mix(in_oklab,var(--phase-menstrual)_45%,transparent)]",
  fertile:
    "bg-[color-mix(in_oklab,var(--phase-follicular)_22%,transparent)] text-[var(--secondary-foreground)]",
  ovulation: "bg-[var(--phase-ovulation)] text-white font-semibold",
  plain: "text-muted-foreground",
};

const LEGEND = [
  { label: "Recorded period", swatch: "bg-[var(--phase-menstrual)]" },
  { label: "Predicted period", swatch: "bg-[color-mix(in_oklab,var(--phase-menstrual)_28%,transparent)]" },
  { label: "Estimated fertile window", swatch: "bg-[color-mix(in_oklab,var(--phase-follicular)_45%,transparent)]" },
  { label: "Estimated ovulation", swatch: "bg-[var(--phase-ovulation)]" },
];

export function CalendarPreview({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-3xl border border-border bg-card p-5 shadow-soft", className)}>
      <div className="mb-4 flex items-center justify-between">
        <p className="font-display text-base font-semibold">{DEMO_MONTH}</p>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          Sample
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {DEMO_WEEKDAYS.map((label, index) => (
          <span
            key={`${label}-${index}`}
            className="pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {label}
          </span>
        ))}

        {DEMO_DAYS.map((cell, index) => (
          <span
            key={index}
            className={cn(
              "flex aspect-square items-center justify-center rounded-xl text-xs tabular-nums",
              cell.day === null ? "opacity-0" : DAY_STYLES[cell.kind],
            )}
          >
            {cell.day ?? ""}
          </span>
        ))}
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4">
        {LEGEND.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className={cn("size-2.5 shrink-0 rounded-full", item.swatch)} aria-hidden="true" />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cycle length chart
// ---------------------------------------------------------------------------

const DEMO_CYCLE_LENGTHS = [
  { label: "Apr", value: 28 },
  { label: "May", value: 29 },
  { label: "Jun", value: 27 },
  { label: "Jul", value: 30 },
  { label: "Aug", value: 28 },
];

export function InsightsPreview({ className }: { className?: string }) {
  const max = Math.max(...DEMO_CYCLE_LENGTHS.map((d) => d.value)) + 4;
  const min = Math.min(...DEMO_CYCLE_LENGTHS.map((d) => d.value)) - 4;
  const height = 140;

  return (
    <div className={cn("rounded-3xl border border-border bg-card p-5 shadow-soft", className)}>
      <div className="mb-1 flex items-baseline justify-between">
        <p className="font-display text-base font-semibold">Cycle length</p>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          Sample
        </span>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Average 28.4 days · varies by 3 days
      </p>

      <div className="flex items-end gap-2.5" style={{ height }}>
        {DEMO_CYCLE_LENGTHS.map((entry) => {
          const pct = (entry.value - min) / (max - min);
          return (
            <div key={entry.label} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-[11px] font-semibold tabular-nums">{entry.value}</span>
              <div
                className="w-full rounded-t-xl bg-gradient-to-t from-[color-mix(in_oklab,var(--primary)_35%,transparent)] to-primary"
                style={{ height: `${Math.max(12, pct * (height - 34))}px` }}
                aria-hidden="true"
              />
              <span className="text-[11px] text-muted-foreground">{entry.label}</span>
            </div>
          );
        })}
      </div>

      <p className="mt-4 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
        Plain-language read: your cycles have stayed close to a month. A single
        longer or shorter cycle is usually not meaningful on its own.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wellness summary
// ---------------------------------------------------------------------------

const DEMO_WELLNESS = [
  { icon: Moon, label: "Sleep", value: "7h 40m", bar: 0.8, tone: "var(--primary)" },
  { icon: Droplet, label: "Water", value: "1.8 L", bar: 0.72, tone: "var(--accent-blue)" },
  { icon: Footprints, label: "Movement", value: "32 min", bar: 0.64, tone: "var(--success)" },
  { icon: Smile, label: "Mood", value: "Calm", bar: 0.86, tone: "var(--accent-rose)" },
];

export function WellnessPreview({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-3xl border border-border bg-card p-5 shadow-soft", className)}>
      <div className="mb-4 flex items-baseline justify-between">
        <p className="font-display text-base font-semibold">Today's wellness</p>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          Sample
        </span>
      </div>

      <ul className="space-y-3.5">
        {DEMO_WELLNESS.map(({ icon: Icon, label, value, bar, tone }) => (
          <li key={label}>
            <div className="mb-1.5 flex items-center gap-2">
              <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-medium">{label}</span>
              <span className="ml-auto text-sm tabular-nums text-muted-foreground">{value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${bar * 100}%`, backgroundColor: tone }}
                aria-hidden="true"
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
