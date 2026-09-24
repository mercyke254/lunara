"use client";

import { useActionState, useState } from "react";
import { CalendarHeart } from "lucide-react";
import { startPregnancyAction } from "@/lib/actions/pregnancy-actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Field } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toISODate, today } from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * Enable pregnancy mode.
 *
 * Two dating paths, because people arrive with different information:
 *   - "I know my last period" → due date is derived (Naegele's rule)
 *   - "I have a due date"     → the LMP anchor is derived from it
 *
 * A clinician-provided due date is always preferred when it exists, since a
 * dating scan is more accurate than calendar arithmetic. The form says so.
 */
export function PregnancyForm() {
  const [state, formAction] = useActionState(startPregnancyAction, IDLE_STATE);
  const [mode, setMode] = useState<"lmp" | "due">("lmp");
  const todayIso = toISODate(today());

  return (
    <form action={formAction} className="space-y-5">
      <FormMessage state={state} />

      <div
        role="radiogroup"
        aria-label="How would you like to date the pregnancy?"
        className="grid gap-2 sm:grid-cols-2"
      >
        {(
          [
            {
              value: "lmp" as const,
              label: "From my last period",
              hint: "Lunara calculates an estimated due date",
            },
            {
              value: "due" as const,
              label: "From a due date",
              hint: "If a scan or clinician has given you one",
            },
          ] as const
        ).map((option) => {
          const active = mode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setMode(option.value)}
              className={cn(
                "rounded-2xl border p-3.5 text-left transition-colors",
                active ? "border-primary bg-primary-soft" : "border-input hover:border-primary/40",
              )}
            >
              <span className="block text-sm font-medium">{option.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{option.hint}</span>
            </button>
          );
        })}
      </div>

      {/* Only the selected path's inputs are rendered, so an unused required
          field can never block submission. */}
      {mode === "lmp" ? (
        <>
          <input type="hidden" name="dueDate" value="" />
          <Field
            label="First day of your last period"
            htmlFor="pregnancy-lmp"
            required
            hint="Used to date the pregnancy. An approximate date is fine if you are unsure."
            error={state.fieldErrors?.lastPeriodStart}
          >
            <Input
              id="pregnancy-lmp"
              name="lastPeriodStart"
              type="date"
              required
              max={todayIso}
              defaultValue={todayIso}
              aria-invalid={Boolean(state.fieldErrors?.lastPeriodStart) || undefined}
            />
          </Field>
        </>
      ) : (
        <>
          <Field
            label="Estimated due date"
            htmlFor="pregnancy-due"
            required
            hint="Copy it exactly as it was given to you, if you can."
            error={state.fieldErrors?.dueDate}
          >
            <Input
              id="pregnancy-due"
              name="dueDate"
              type="date"
              required
              aria-invalid={Boolean(state.fieldErrors?.dueDate) || undefined}
            />
          </Field>
          <Field
            label="First day of your last period (optional)"
            htmlFor="pregnancy-lmp-optional"
            hint="If you know it, providing both gives the most accurate timeline."
          >
            <Input
              id="pregnancy-lmp-optional"
              name="lastPeriodStart"
              type="date"
              max={todayIso}
              defaultValue={todayIso}
            />
          </Field>
        </>
      )}

      <Alert variant="medical">
        <CalendarHeart aria-hidden="true" />
        <AlertTitle>Before you continue</AlertTitle>
        <AlertDescription>
          Lunara shows a week count and a general timeline. It does not interpret
          scans, track your baby's growth, or replace antenatal care. Your
          midwife or doctor is the right source for anything clinical.
        </AlertDescription>
      </Alert>

      <SubmitButton block size="lg" pendingLabel="Enabling…">
        Enable pregnancy mode
      </SubmitButton>

      <p className="text-xs leading-relaxed text-muted-foreground">
        You can turn this off at any time. Lunara stores only these dates — no
        medical history and no test results.
      </p>
    </form>
  );
}
