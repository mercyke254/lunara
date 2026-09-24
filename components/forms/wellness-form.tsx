"use client";

import { useActionState, useState } from "react";
import { Save } from "lucide-react";
import { addWaterAction, saveWellnessAction } from "@/lib/actions/log-actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { RatingInput } from "@/components/forms/rating-input";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  DAILY_GOALS,
  ENERGY_LABELS,
  EXERCISE_OPTIONS,
  SLEEP_QUALITY_LABELS,
  STRESS_LABELS,
  WATER_PRESETS_ML,
} from "@/lib/constants";
import { toISODate, today } from "@/lib/dates";

/**
 * Wellness entry form.
 *
 * Two independent writes share this panel:
 *   - the main form upserts the whole day's wellness record
 *   - the water buttons are their own form, so adding a glass of water is a
 *     single tap that does not require saving anything else
 *
 * The water buttons submit `amount` as a hidden field, and the server performs
 * the increment inside a transaction so rapid taps cannot lose an increment.
 */
export function WellnessForm({
  date,
  existing,
}: {
  date?: string;
  existing: {
    weight: number | null;
    temperature: number | null;
    sleep: number | null;
    sleepQuality: number | null;
    energy: number | null;
    stress: number | null;
    water: number | null;
    exerciseMinutes: number | null;
    exercise: string | null;
  } | null;
}) {
  const [state, formAction] = useActionState(saveWellnessAction, IDLE_STATE);
  const [waterState, waterAction] = useActionState(addWaterAction, IDLE_STATE);

  const [entryDate, setEntryDate] = useState(date ?? toISODate(today()));
  const [energy, setEnergy] = useState<number | null>(existing?.energy ?? null);
  const [stress, setStress] = useState<number | null>(existing?.stress ?? null);
  const [sleepQuality, setSleepQuality] = useState<number | null>(
    existing?.sleepQuality ?? null,
  );

  const water = existing?.water ?? 0;
  const waterPercent = Math.min(100, Math.round((water / DAILY_GOALS.WATER_ML) * 100));

  return (
    <div className="space-y-5">
      <FormMessage state={state} />
      <FormMessage state={waterState} />

      {/* --- Water quick add --------------------------------------------- */}
      <div className="space-y-3 rounded-2xl border border-border bg-muted/40 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Label>Water today</Label>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground tabular-nums">
              {Math.round(water)}
            </span>{" "}
            / {DAILY_GOALS.WATER_ML} ml
            {waterPercent >= 100 ? " · goal reached" : ""}
          </p>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-background">
          <div
            className="h-full rounded-full bg-[var(--accent-blue)] transition-all duration-500"
            style={{ width: `${waterPercent}%` }}
            role="progressbar"
            aria-valuenow={waterPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Water intake progress"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {WATER_PRESETS_ML.map((amount) => (
            <form key={amount} action={waterAction}>
              <input type="hidden" name="amount" value={amount} />
              <input type="hidden" name="date" value={entryDate} />
              <Button type="submit" variant="outline" size="sm">
                +{amount} ml
              </Button>
            </form>
          ))}
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          The target is a general guide for adults, not a personal prescription.
        </p>
      </div>

      {/* --- Full entry -------------------------------------------------- */}
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="date" value={entryDate} />

        <div className="space-y-1.5">
          <Label htmlFor="wellness-date">Date</Label>
          <Input
            id="wellness-date"
            type="date"
            value={entryDate}
            max={toISODate(today())}
            onChange={(event) => setEntryDate(event.target.value)}
            className="w-44"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sleep duration" htmlFor="wellness-sleep" hint="hours">
            <Input
              id="wellness-sleep"
              name="sleep"
              type="number"
              step="0.25"
              min={0}
              max={24}
              inputMode="decimal"
              defaultValue={existing?.sleep ?? ""}
              placeholder="—"
            />
          </Field>

          <Field label="Water" htmlFor="wellness-water" hint="millilitres (total for the day)">
            <Input
              id="wellness-water"
              name="water"
              type="number"
              step="50"
              min={0}
              max={10000}
              inputMode="numeric"
              defaultValue={existing?.water ?? ""}
              placeholder="—"
            />
          </Field>

          <Field label="Movement" htmlFor="wellness-exercise" hint="minutes">
            <Input
              id="wellness-exercise"
              name="exerciseMinutes"
              type="number"
              min={0}
              max={1440}
              inputMode="numeric"
              defaultValue={existing?.exerciseMinutes ?? ""}
              placeholder="—"
            />
          </Field>

          <div className="space-y-1.5">
            <Label htmlFor="wellness-exercise-level">How hard did it feel?</Label>
            <NativeSelect
              id="wellness-exercise-level"
              name="exercise"
              defaultValue={existing?.exercise ?? ""}
            >
              <option value="">Not specified</option>
              {EXERCISE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </div>

          <Field label="Weight" htmlFor="wellness-weight" hint="kg">
            <Input
              id="wellness-weight"
              name="weight"
              type="number"
              step="0.1"
              min={20}
              max={400}
              inputMode="decimal"
              defaultValue={existing?.weight ?? ""}
              placeholder="—"
            />
          </Field>

          <Field
            label="Basal temperature"
            htmlFor="wellness-temperature"
            hint="°C, measured at the same time each morning"
          >
            <Input
              id="wellness-temperature"
              name="temperature"
              type="number"
              step="0.01"
              min={30}
              max={45}
              inputMode="decimal"
              defaultValue={existing?.temperature ?? ""}
              placeholder="—"
            />
          </Field>
        </div>

        <div className="grid gap-5 border-t border-border pt-5 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Energy</Label>
            <RatingInput name="energy" value={energy} onChange={setEnergy} labels={ENERGY_LABELS} />
          </div>
          <div className="space-y-2">
            <Label>Stress</Label>
            <RatingInput name="stress" value={stress} onChange={setStress} labels={STRESS_LABELS} />
          </div>
          <div className="space-y-2">
            <Label>Sleep quality</Label>
            <RatingInput
              name="sleepQuality"
              value={sleepQuality}
              onChange={setSleepQuality}
              labels={SLEEP_QUALITY_LABELS}
            />
          </div>
        </div>

        <SubmitButton pendingLabel="Saving…">
          <Save aria-hidden="true" />
          Save wellness entry
        </SubmitButton>
      </form>
    </div>
  );
}
