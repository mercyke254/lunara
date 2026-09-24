"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Live password policy checklist.
 *
 * Showing the rules BEFORE submission (rather than after a rejection) is the
 * single biggest reduction in form friction. The same rules are enforced
 * server-side by the Zod schema — this component is guidance, not validation.
 *
 * Colour is paired with an icon and a text label, so the state is never
 * communicated by colour alone.
 */

interface Requirement {
  label: string;
  test: (value: string) => boolean;
}

const REQUIREMENTS: Requirement[] = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "One lowercase letter", test: (v) => /[a-z]/.test(v) },
  { label: "One number", test: (v) => /[0-9]/.test(v) },
];

export function PasswordRequirements({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <ul className={cn("mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2", className)}>
      {REQUIREMENTS.map(({ label, test }) => {
        const met = test(value);
        return (
          <li
            key={label}
            className={cn(
              "flex items-center gap-1.5 text-xs",
              met ? "text-[var(--success)]" : "text-muted-foreground",
            )}
          >
            {met ? (
              <Check className="size-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <X className="size-3.5 shrink-0" aria-hidden="true" />
            )}
            <span>{label}</span>
            <span className="sr-only">{met ? " — met" : " — not met yet"}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** True when every policy rule passes. Used to enable the submit button. */
export function isPasswordPolicySatisfied(value: string): boolean {
  return REQUIREMENTS.every(({ test }) => test(value));
}
