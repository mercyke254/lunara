import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

/**
 * The Lunara mark - an original design.
 *
 * Concept: an open ring (the cycle) with a solid nucleus (today / ovulation)
 * and a soft halo. It reads as a moon phase, a cycle dial, and an orbit, without
 * borrowing any third-party brand's shapes, letterforms, or colours.
 *
 * Implementation note: the gradient is defined inline with a fixed id. Multiple
 * instances intentionally share the identical definition, so rendering the logo
 * more than once is visually correct; callers may override `gradientId` if a
 * page needs them to differ.
 */

const RING_CIRCUMFERENCE = 2 * Math.PI * 15;

export interface LunaraLogoProps {
  className?: string;
  /** Mark size in pixels. */
  size?: number;
  /** Render the "Lunara" wordmark next to the mark. */
  showWordmark?: boolean;
  /** Wordmark size class override. */
  wordmarkClassName?: string;
  gradientId?: string;
}

export function LunaraMark({
  className,
  size = 40,
  gradientId = "lunara-brand-gradient",
}: Pick<LunaraLogoProps, "className" | "size" | "gradientId">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label={`${APP_NAME} logo`}
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="6"
          y1="4"
          x2="42"
          y2="44"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#8B7BD8" />
          <stop offset="0.55" stopColor="#A79AEC" />
          <stop offset="1" stopColor="#8FB8F0" />
        </linearGradient>
      </defs>

      {/* Soft halo - a gentle glow rather than a hard disc. */}
      <circle cx="24" cy="24" r="21" fill={`url(#${gradientId})`} opacity="0.1" />

      {/* The cycle: an open ring, rotated so the gap sits at the top right. */}
      <circle
        cx="24"
        cy="24"
        r="15"
        stroke={`url(#${gradientId})`}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={`${RING_CIRCUMFERENCE * 0.78} ${RING_CIRCUMFERENCE * 0.22}`}
        transform="rotate(-118 24 24)"
      />

      {/* Nucleus: the present day. */}
      <circle cx="24" cy="24" r="4.75" fill={`url(#${gradientId})`} />

      {/* Small satellite marking a point on the cycle. */}
      <circle cx="24" cy="7.5" r="2.4" fill={`url(#${gradientId})`} opacity="0.85" />
    </svg>
  );
}

export function LunaraLogo({
  className,
  size = 36,
  showWordmark = true,
  wordmarkClassName,
  gradientId,
}: LunaraLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LunaraMark size={size} gradientId={gradientId} />
      {showWordmark ? (
        <span
          className={cn(
            "font-display text-xl font-semibold tracking-tight text-foreground",
            wordmarkClassName,
          )}
        >
          {APP_NAME}
        </span>
      ) : null}
    </span>
  );
}
