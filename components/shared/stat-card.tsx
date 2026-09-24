import { cn } from "@/lib/utils";

/**
 * Metric tile used across the dashboard, insights, and wellness screens.
 *
 * `value` is rendered large and `hint` small, so a glance gives the number and a
 * second glance gives its meaning. `tone` tints the icon chip only - never the
 * number itself, which keeps values legible in both themes.
 */

type Tone = "primary" | "blue" | "rose" | "success" | "warning" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  primary: "bg-primary-soft text-primary",
  blue: "bg-[color-mix(in_oklab,var(--accent-blue)_16%,transparent)] text-[var(--accent-blue)]",
  rose: "bg-accent text-accent-foreground",
  success: "bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-[var(--success)]",
  warning: "bg-[color-mix(in_oklab,var(--warning)_16%,transparent)] text-[var(--warning)]",
  neutral: "bg-muted text-muted-foreground",
};

export function StatCard({
  label,
  value,
  unit,
  hint,
  icon,
  tone = "primary",
  className,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-4 shadow-soft transition-shadow hover:shadow-lift dark:shadow-none",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {icon ? (
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-xl [&_svg]:size-4",
              TONE_CLASSES[tone],
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>

      <p className="mt-2 flex items-baseline gap-1">
        <span className="font-display text-2xl font-semibold leading-none tracking-tight">
          {value}
        </span>
        {unit ? <span className="text-sm text-muted-foreground">{unit}</span> : null}
      </p>

      {hint ? (
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
