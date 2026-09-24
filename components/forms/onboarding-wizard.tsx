"use client";

import { useActionState, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { completeOnboardingAction } from "@/lib/actions/auth-actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
// Imported directly (this is a Client Component), so the literal types of these
// option lists are preserved and no serialisation shim is needed.
import { AGE_RANGES, REGULARITY_OPTIONS, TRACKING_GOAL_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toISODate, today } from "@/lib/dates";

/**
 * Onboarding wizard.
 *
 * Implementation note: only the CURRENT step's controls are rendered, and the
 * collected values live in React state. Rendering every step and hiding the
 * inactive ones would look simpler, but `required` inputs inside a hidden
 * container block form submission with an "invalid form control is not
 * focusable" error. Keeping one set of inputs on screen avoids that entirely.
 *
 * The final step submits a single form whose hidden inputs carry everything.
 */

const STEPS = [
  { title: "About you", description: "Optional, and only used to tailor guidance." },
  { title: "Your cycle", description: "Best guesses are fine — these get refined as you log." },
  { title: "What brings you here", description: "Pick anything that fits." },
] as const;

const CYCLE_LENGTH_PRESETS = [21, 26, 28, 30, 35];
const PERIOD_LENGTH_PRESETS = [3, 4, 5, 6, 7];

interface WizardState {
  ageRange: string;
  dateOfBirth: string;
  averageCycleLength: number;
  averagePeriodLength: number;
  lastPeriodStart: string;
  cycleRegularity: string;
  trackingGoals: string[];
}

export function OnboardingWizard({ defaultName }: { defaultName: string }) {
  const [state, formAction] = useActionState(completeOnboardingAction, IDLE_STATE);
  const [step, setStep] = useState(0);

  const [values, setValues] = useState<WizardState>({
    ageRange: "",
    dateOfBirth: "",
    averageCycleLength: 28,
    averagePeriodLength: 5,
    lastPeriodStart: toISODate(today()),
    cycleRegularity: "UNKNOWN",
    trackingGoals: [],
  });

  const ageRanges = AGE_RANGES;
  const regularityOptions = REGULARITY_OPTIONS;
  const goalOptions = TRACKING_GOAL_OPTIONS;

  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function toggleGoal(goal: string) {
    setValues((prev) => ({
      ...prev,
      trackingGoals: prev.trackingGoals.includes(goal)
        ? prev.trackingGoals.filter((g) => g !== goal)
        : [...prev.trackingGoals, goal],
    }));
  }

  const step1Valid = values.lastPeriodStart !== "";
  const canAdvance = step === 0 || step === 1 ? (step === 1 ? step1Valid : true) : values.trackingGoals.length > 0;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div>
        <div className="flex items-center gap-2" aria-hidden="true">
          {STEPS.map((s, index) => (
            <div
              key={s.title}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                index <= step ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>
        <p className="mt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Step {step + 1} of {STEPS.length}
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {STEPS[step].title}
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {STEPS[step].description}
        </p>
      </div>

      <FormMessage state={state} />

      <form action={formAction} className="space-y-5">
        {/* Values from earlier steps travel as hidden inputs. */}
        <input type="hidden" name="averageCycleLength" value={values.averageCycleLength} />
        <input type="hidden" name="averagePeriodLength" value={values.averagePeriodLength} />
        <input type="hidden" name="lastPeriodStart" value={values.lastPeriodStart} />
        <input type="hidden" name="cycleRegularity" value={values.cycleRegularity} />
        <input type="hidden" name="ageRange" value={values.ageRange} />
        <input type="hidden" name="dateOfBirth" value={values.dateOfBirth} />
        {values.trackingGoals.map((goal) => (
          <input key={goal} type="hidden" name="trackingGoals" value={goal} />
        ))}

        {/* --- Step 1: about you ---------------------------------------- */}
        {step === 0 ? (
          <div className="space-y-5">
            <p className="rounded-2xl bg-muted/60 p-3.5 text-sm leading-relaxed text-muted-foreground">
              Hi {defaultName.split(" ")[0]}. Lunara only asks for what changes
              what it shows you. Age can matter for cycle patterns, and it is
              entirely optional.
            </p>

            <div className="space-y-2">
              <Label htmlFor="ageRange">Age range</Label>
              <div className="flex flex-wrap gap-2">
                {ageRanges.map((range) => {
                  const active = values.ageRange === range;
                  return (
                    <button
                      key={range}
                      type="button"
                      onClick={() => update("ageRange", active ? "" : range)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-full border px-3.5 py-2 text-sm transition-colors",
                        active
                          ? "border-primary bg-primary-soft font-medium text-primary"
                          : "border-input bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      )}
                    >
                      {range}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dateOfBirth">Date of birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={values.dateOfBirth}
                max={toISODate(today())}
                onChange={(event) => update("dateOfBirth", event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Optional. Used only to describe age-related cycle context.
              </p>
            </div>
          </div>
        ) : null}

        {/* --- Step 2: cycle -------------------------------------------- */}
        {step === 1 ? (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="cycleLengthInput">Average cycle length</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="cycleLengthInput"
                  type="number"
                  min={15}
                  max={90}
                  value={values.averageCycleLength}
                  onChange={(event) =>
                    update(
                      "averageCycleLength",
                      Math.max(15, Math.min(90, Number(event.target.value) || 15)),
                    )
                  }
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  days, counting from the first day of one period to the day
                  before the next
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {CYCLE_LENGTH_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => update("averageCycleLength", preset)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      values.averageCycleLength === preset
                        ? "border-primary bg-primary-soft font-medium text-primary"
                        : "border-input text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    {preset} days
                  </button>
                ))}
              </div>
              {state.fieldErrors?.averageCycleLength ? (
                <p role="alert" className="text-xs font-medium text-destructive">
                  {state.fieldErrors.averageCycleLength}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="periodLengthInput">Average period length</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="periodLengthInput"
                  type="number"
                  min={1}
                  max={14}
                  value={values.averagePeriodLength}
                  onChange={(event) =>
                    update(
                      "averagePeriodLength",
                      Math.max(1, Math.min(14, Number(event.target.value) || 1)),
                    )
                  }
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">days of bleeding</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {PERIOD_LENGTH_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => update("averagePeriodLength", preset)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      values.averagePeriodLength === preset
                        ? "border-primary bg-primary-soft font-medium text-primary"
                        : "border-input text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    {preset} days
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lastPeriodStart">
                First day of your last period
                <span className="text-destructive" aria-hidden="true">*</span>
              </Label>
              <Input
                id="lastPeriodStart"
                type="date"
                required
                value={values.lastPeriodStart}
                max={toISODate(today())}
                onChange={(event) => update("lastPeriodStart", event.target.value)}
                aria-invalid={Boolean(state.fieldErrors?.lastPeriodStart) || undefined}
              />
              <p className="text-xs text-muted-foreground">
                This is the anchor for every prediction. If you are not sure of
                the exact day, an approximate date is a fine starting point.
              </p>
              {state.fieldErrors?.lastPeriodStart ? (
                <p role="alert" className="text-xs font-medium text-destructive">
                  {state.fieldErrors.lastPeriodStart}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>How regular are your cycles?</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {regularityOptions.map((option) => {
                  const active = values.cycleRegularity === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => update("cycleRegularity", option.value)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-2xl border p-3.5 text-left transition-colors",
                        active
                          ? "border-primary bg-primary-soft"
                          : "border-input bg-background hover:border-primary/40",
                      )}
                    >
                      <span className="flex items-center gap-2 text-sm font-medium">
                        {option.label}
                        {active ? <Check className="size-3.5 text-primary" aria-hidden="true" /> : null}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {option.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {/* --- Step 3: goals ------------------------------------------- */}
        {step === 2 ? (
          <div className="space-y-5">
            <div className="grid gap-2 sm:grid-cols-2">
              {goalOptions.map((goal) => {
                const active = values.trackingGoals.includes(goal.value);
                return (
                  <button
                    key={goal.value}
                    type="button"
                    onClick={() => toggleGoal(goal.value)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-2xl border p-3.5 text-left transition-colors",
                      active
                        ? "border-primary bg-primary-soft"
                        : "border-input bg-background hover:border-primary/40",
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {goal.label}
                      {active ? <Check className="size-3.5 text-primary" aria-hidden="true" /> : null}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {goal.hint}
                    </span>
                  </button>
                );
              })}
            </div>

            {state.fieldErrors?.trackingGoals ? (
              <p role="alert" className="text-xs font-medium text-destructive">
                {state.fieldErrors.trackingGoals}
              </p>
            ) : null}

            <Alert variant="info">
              <AlertDescription>
                Lunara will calculate an estimated next period, fertile window,
                and ovulation date from the details you just gave. Everything is
                labelled as an estimate, and it becomes more accurate with each
                cycle you log.
              </AlertDescription>
            </Alert>

            <div className="flex items-start gap-3">
              <Checkbox id="confirmAccuracy" required className="mt-0.5" />
              <Label htmlFor="confirmAccuracy" className="items-start font-normal">
                <span className="text-sm text-muted-foreground">
                  I understand Lunara is a tracking tool, not a medical device,
                  and that its predictions are estimates.
                </span>
              </Label>
            </div>
          </div>
        ) : null}

        {/* --- Navigation ---------------------------------------------- */}
        <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ArrowLeft aria-hidden="true" />
            Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              disabled={!canAdvance}
            >
              Continue
              <ArrowRight aria-hidden="true" />
            </Button>
          ) : (
            <SubmitButton pendingLabel="Finishing…" disabled={values.trackingGoals.length === 0}>
              Finish setup
            </SubmitButton>
          )}
        </div>
      </form>
    </div>
  );
}
