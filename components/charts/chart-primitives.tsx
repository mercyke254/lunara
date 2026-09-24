"use client";

import { cn } from "@/lib/utils";

/**
 * Shared chart presentation.
 *
 * Why these wrappers exist: Recharts needs concrete pixel heights (a
 * `ResponsiveContainer` inside an auto-height parent collapses to zero), and
 * every chart needs the same empty state, the same dashed "not enough data"
 * treatment, and the same tooltip styling. Centralising that here means a new
 * chart cannot accidentally ship with an unreadable tooltip or a missing
 * empty state.
 *
 * All colours come from the CSS custom properties in globals.css, so charts
 * follow the light/dark theme with no duplicated palettes.
 */

export const CHART_COLORS = {
  primary: "var(--primary)",
  blue: "var(--accent-blue)",
  rose: "var(--accent-rose)",
  menstrual: "var(--phase-menstrual)",
  follicular: "var(--phase-follicular)",
  ovulation: "var(--phase-ovulation)",
  luteal: "var(--phase-luteal)",
  success: "var(--success)",
  warning: "var(--warning)",
  muted: "var(--muted-foreground)",
} as const;

export const AXIS_PROPS = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

/** Tailwind class names applied to the Recharts tooltip container. */
export const TOOLTIP_CLASS =
  "rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-lift";

export function ChartFrame({
  height = 240,
  className,
  empty,
  emptyMessage,
  children,
}: {
  height?: number;
  className?: string;
  /** When true, renders the empty state instead of the chart. */
  empty?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
}) {
  if (empty) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 px-6 text-center",
          className,
        )}
        style={{ height }}
      >
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          {emptyMessage ?? "Not enough data yet. Log a few days and this chart will fill in."}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      {children}
    </div>
  );
}

/** Axis tick formatter that truncates long category names. */
export function truncateTick(value: unknown, max = 12): string {
  const text = String(value ?? "");
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
