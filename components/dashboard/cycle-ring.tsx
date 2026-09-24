import { cn } from "@/lib/utils";
import { PHASE_META } from "@/lib/constants";
import type { CyclePhase } from "@/lib/calculations/cycle";

/**
 * The cycle progress dial.
 *
 * A ring whose arc length is the fraction of the cycle completed, tinted with
 * the current phase's colour and carrying the day count in the middle:
 *
 *        DAY 14
 *        OF 28
 *
 * Rendered as a Server Component with pure SVG - no chart library, no client
 * JavaScript, no layout shift. It scales via the `size` prop (viewBox-based) and
 * is decorative-with-meaning: the accessible name restates the numbers, so a
 * screen-reader user gets the same information.
 *
 * The stroke animation is CSS-only and is disabled automatically under
 * `prefers-reduced-motion` (see globals.css).
 */

const VIEWBOX = 200;
const CENTER = VIEWBOX / 2;
const RADIUS = 82;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export interface CycleRingProps {
  cycleDay: number | null;
  cycleLength: number;
  phase: CyclePhase;
  size?: number;
  /** Override the default "OF {cycleLength}" caption. */
  caption?: string;
  className?: string;
}

export function CycleRing({
  cycleDay,
  cycleLength,
  phase,
  size = 232,
  caption,
  className,
}: CycleRingProps) {
  const safeLength = cycleLength > 0 ? cycleLength : 28;
  // Clamp so an overrunning cycle does not draw an arc past a full turn.
  const fraction =
    cycleDay === null ? 0 : Math.min(1, Math.max(0.01, cycleDay / safeLength));
  const dash = CIRCUMFERENCE * fraction;
  const meta = PHASE_META[phase];

  const accessibleLabel =
    cycleDay === null
      ? "Cycle day unknown. Log a period start to begin tracking."
      : `Cycle day ${cycleDay} of an estimated ${safeLength} day cycle. ${meta.label}.`;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={accessibleLabel}
    >
      {/* Phase-tinted glow behind the dial. */}
      <span
        aria-hidden="true"
        className="absolute inset-[12%] rounded-full blur-2xl"
        style={{
          backgroundColor: meta.colorVar,
          opacity: 0.16,
        }}
      />

      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        width={size}
        height={size}
        className="relative -rotate-90"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="cycle-ring-progress" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={meta.colorVar} />
            <stop offset="100%" stopColor="var(--primary)" />
          </linearGradient>
        </defs>

        {/* Track */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="var(--muted)"
          strokeWidth="13"
        />

        {/* Progress arc */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="url(#cycle-ring-progress)"
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
          className="animate-draw-ring motion-reduce:animate-none"
          style={{ strokeDashoffset: 0 }}
        />

        {/* Day ticks every 7 days, for a sense of scale. */}
        {Array.from({ length: Math.min(safeLength, 35) }, (_, i) => i).map((day) =>
          day % 7 === 0 ? (
            <line
              key={day}
              x1={CENTER + RADIUS - 20}
              y1={CENTER}
              x2={CENTER + RADIUS - 14}
              y2={CENTER}
              stroke="var(--background)"
              strokeWidth="2.5"
              strokeLinecap="round"
              transform={`rotate(${(day / safeLength) * 360} ${CENTER} ${CENTER})`}
              opacity="0.7"
            />
          ) : null,
        )}
      </svg>

      {/* Centre content - rotated back to upright. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {cycleDay === null ? (
          <>
            <span className="font-display text-2xl font-semibold">No data</span>
            <span className="mt-1 max-w-[70%] text-xs leading-relaxed text-muted-foreground">
              Log a period start
            </span>
          </>
        ) : (
          <>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Day
            </span>
            <span className="font-display text-5xl font-semibold leading-none tracking-tight">
              {cycleDay}
            </span>
            <span className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {caption ?? `of ${safeLength}`}
            </span>
            <span
              className="mt-2.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{
                backgroundColor: `color-mix(in oklab, ${meta.colorVar} 18%, transparent)`,
                color: meta.colorVar,
              }}
            >
              {meta.shortLabel}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
