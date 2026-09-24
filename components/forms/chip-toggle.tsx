"use client";

import { cn } from "@/lib/utils";

/**
 * Selectable chip.
 *
 * Colour is never the only signal: the selected state also sets
 * `aria-pressed`, and a tick appears. The chip is a real <button> rather than a
 * hidden checkbox, so the touch target and focus ring are correct and the
 * keyboard interaction is a plain Enter/Space press.
 *
 * The value is carried to the server by a companion hidden input rendered by the
 * caller for each selected chip, which keeps the form serialisation explicit.
 */
export function ChipToggle({
  label,
  selected,
  onClick,
  className,
  tone = "primary",
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  className?: string;
  tone?: "primary" | "rose" | "blue";
}) {
  const selectedClasses = {
    primary: "border-primary bg-primary-soft font-medium text-primary",
    rose: "border-[var(--accent-rose)] bg-accent font-medium text-accent-foreground",
    blue: "border-[var(--accent-blue)] bg-[color-mix(in_oklab,var(--accent-blue)_14%,transparent)] font-medium text-[var(--secondary-foreground)]",
  }[tone];

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        selected
          ? selectedClasses
          : "border-input bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
        className,
      )}
    >
      {selected ? (
        <svg
          viewBox="0 0 24 24"
          className="size-3.5 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : null}
      {label}
    </button>
  );
}
