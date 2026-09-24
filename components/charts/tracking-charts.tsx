"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AXIS_PROPS,
  CHART_COLORS,
  ChartFrame,
  TOOLTIP_CLASS,
  truncateTick,
} from "@/components/charts/chart-primitives";

/**
 * Charts for the insights and wellness screens.
 *
 * Every chart is a Client Component (Recharts needs the DOM) but receives plain
 * serialisable arrays, so the server does all the querying and aggregation.
 *
 * Accessibility: each chart is `aria-hidden` decoration behind a visible
 * summary, and the same numbers are always rendered as text nearby. A chart
 * alone is not an accessible way to convey data.
 */

// ---------------------------------------------------------------------------
// Cycle length over time
// ---------------------------------------------------------------------------

export interface CycleLengthPoint {
  label: string;
  days: number;
}

export function CycleLengthChart({
  data,
  average,
  height = 240,
}: {
  data: CycleLengthPoint[];
  average: number;
  height?: number;
}) {
  return (
    <ChartFrame
      height={height}
      empty={data.length === 0}
      emptyMessage="Log two period starts and your cycle lengths will appear here."
    >
      <div aria-hidden="true" className="size-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" {...AXIS_PROPS} />
            <YAxis
              {...AXIS_PROPS}
              width={40}
              domain={["dataMin - 3", "dataMax + 3"]}
              tickFormatter={(value: number) => `${value}d`}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--popover)",
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--muted-foreground)" }}
              formatter={(value) => [`${value} days`, "Cycle length"]}
              cursor={{ stroke: "var(--border)" }}
            />
            <Line
              type="monotone"
              dataKey="days"
              stroke={CHART_COLORS.primary}
              strokeWidth={2.5}
              dot={{ r: 4, fill: CHART_COLORS.primary, strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
            {/* Reference line for the average, drawn as a plain Line so no extra
                import is needed. */}
            <Line
              type="monotone"
              dataKey={() => average}
              stroke={CHART_COLORS.blue}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

// ---------------------------------------------------------------------------
// Frequency bars (symptoms, moods)
// ---------------------------------------------------------------------------

export interface FrequencyPoint {
  label: string;
  count: number;
}

export function FrequencyChart({
  data,
  color = CHART_COLORS.rose,
  height = 260,
  emptyMessage,
}: {
  data: FrequencyPoint[];
  color?: string;
  height?: number;
  emptyMessage?: string;
}) {
  return (
    <ChartFrame height={height} empty={data.length === 0} emptyMessage={emptyMessage}>
      <div aria-hidden="true" className="size-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" {...AXIS_PROPS} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="label"
              {...AXIS_PROPS}
              width={110}
              tickFormatter={(value) => truncateTick(value, 16)}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--popover)",
                fontSize: 12,
              }}
              formatter={(value) => [`${value} days`, "Logged"]}
              cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            />
            <Bar dataKey="count" fill={color} radius={[0, 8, 8, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

// ---------------------------------------------------------------------------
// Wellness trend
// ---------------------------------------------------------------------------

export interface WellnessPoint {
  label: string;
  sleep: number | null;
  water: number | null;
  energy: number | null;
  stress: number | null;
}

export function WellnessTrendChart({
  data,
  metric,
  color = CHART_COLORS.blue,
  unit,
  domain,
  height = 240,
}: {
  data: WellnessPoint[];
  metric: "sleep" | "water" | "energy" | "stress";
  color?: string;
  unit?: string;
  domain?: [number, number];
  height?: number;
}) {
  const points = data.filter((point) => point[metric] !== null);

  return (
    <ChartFrame
      height={height}
      empty={points.length === 0}
      emptyMessage="No entries for this metric yet in the selected period."
    >
      <div aria-hidden="true" className="size-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id={`wellness-fill-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" {...AXIS_PROPS} />
            <YAxis
              {...AXIS_PROPS}
              width={40}
              domain={domain ?? ["auto", "auto"]}
              tickFormatter={(value: number) => `${value}`}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--popover)",
                fontSize: 12,
              }}
              formatter={(value) => [`${value}${unit ? ` ${unit}` : ""}`, metric]}
            />
            <Area
              type="monotone"
              dataKey={metric}
              stroke={color}
              strokeWidth={2.5}
              fill={`url(#wellness-fill-${metric})`}
              connectNulls
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

// ---------------------------------------------------------------------------
// Symptom distribution by cycle phase (stacked)
// ---------------------------------------------------------------------------

export interface PhaseBreakdownPoint {
  label: string;
  menstrual: number;
  follicular: number;
  ovulation: number;
  luteal: number;
}

const PHASE_SERIES = [
  { key: "menstrual", label: "Menstrual", color: CHART_COLORS.menstrual },
  { key: "follicular", label: "Follicular", color: CHART_COLORS.follicular },
  { key: "ovulation", label: "Ovulation", color: CHART_COLORS.ovulation },
  { key: "luteal", label: "Luteal", color: CHART_COLORS.luteal },
] as const;

export function PhaseBreakdownChart({
  data,
  height = 280,
}: {
  data: PhaseBreakdownPoint[];
  height?: number;
}) {
  return (
    <ChartFrame
      height={height}
      empty={data.length === 0}
      emptyMessage="Log symptoms across at least one full cycle and phase grouping will appear here."
    >
      <div className="size-full">
        <div aria-hidden="true" className="size-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" {...AXIS_PROPS} tickFormatter={(v) => truncateTick(v, 12)} />
              <YAxis {...AXIS_PROPS} width={40} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--popover)",
                  fontSize: 12,
                }}
                cursor={{ fill: "var(--muted)", opacity: 0.5 }}
              />
              {PHASE_SERIES.map((series, index) => (
                <Bar
                  key={series.key}
                  dataKey={series.key}
                  stackId="phase"
                  fill={series.color}
                  radius={index === PHASE_SERIES.length - 1 ? [8, 8, 0, 0] : undefined}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend as real text, so it is readable and not colour-only. */}
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {PHASE_SERIES.map((series) => (
            <li key={series.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: series.color }}
                aria-hidden="true"
              />
              {series.label}
            </li>
          ))}
        </ul>
      </div>
    </ChartFrame>
  );
}

// ---------------------------------------------------------------------------
// Mood distribution (donut-style bar)
// ---------------------------------------------------------------------------

export function MoodDistributionChart({
  data,
  height = 220,
}: {
  data: FrequencyPoint[];
  height?: number;
}) {
  const palette = [
    CHART_COLORS.primary,
    CHART_COLORS.blue,
    CHART_COLORS.rose,
    CHART_COLORS.ovulation,
    CHART_COLORS.follicular,
    CHART_COLORS.luteal,
    CHART_COLORS.success,
    CHART_COLORS.warning,
  ];

  return (
    <ChartFrame
      height={height}
      empty={data.length === 0}
      emptyMessage="Log your mood on a few days and the distribution will show here."
    >
      <div aria-hidden="true" className="size-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" {...AXIS_PROPS} tickFormatter={(v) => truncateTick(v, 9)} />
            <YAxis {...AXIS_PROPS} width={40} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--popover)",
                fontSize: 12,
              }}
              formatter={(value) => [`${value} days`, "Logged"]}
              cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            />
            <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={44}>
              {data.map((entry, index) => (
                <Cell key={entry.label} fill={palette[index % palette.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

/** Re-exported toast class so consumers do not import from two places. */
export { TOOLTIP_CLASS };
