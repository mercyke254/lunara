"use client";

import { cn } from "@/lib/utils";

/**
 * 1-N subjective rating as a segmented control.
 *
 * Uses a radiogroup so arrow keys move between options, and prints the plain =
 * language label for the active value underneath. Numeric-only scales are hard
 * to answer consistently; the label keeps the meaning of "4" explicit, which
 * matters when the numbers are charted later.
 *
 * A hidden input with `name` carries the value into FormData.
 */
export function RatingInput({
  name,
  value,
  onChange,
  labels,
  max = 5,
  id,
}: {
  name: string;
  value: number | null;
  onChange: (value: number | null) => void;
  /** Human-readable label per value, e.g. { 1: "Running on empty" }. */
  labels: Record<number, string>;
  max?: number;
  id?: string;
}) {
  const options = Array.from({ length: max }, (_, i) => i + 1);

  return (
    <div className="space-y-1.5">
      <input type="hidden" name={name} value={value ?? ""} />

      <div
        role="radiogroup"
        aria-label={name}
        className="flex gap-1.5"
        id={id}
      >
        {options.map((option) => {
          const active = value === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${option} — ${labels[option] ?? option}`}
              onClick={() => onChange(active ? null : option)}
              className={cn(
                "h-10 flex-1 rounded-xl border text-sm font-medium tabular-nums transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        {value !== null ? (labels[value] ?? "") : "Not rated — tap a number, or tap again to clear."}
      </p>
    </div>
  );
}
