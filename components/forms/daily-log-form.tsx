"use client";

import { useActionState, useEffect, useState } from "react";
import { ChevronDown, Lock, Save, Trash2 } from "lucide-react";
import { deleteDailyLogAction, saveDailyLogAction } from "@/lib/actions/log-actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { ChipToggle } from "@/components/forms/chip-toggle";
import { RatingInput } from "@/components/forms/rating-input";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DAILY_GOALS,
  ENERGY_LABELS,
  EXERCISE_OPTIONS,
  MOOD_OPTIONS,
  SEVERITY_LABELS,
  SLEEP_QUALITY_LABELS,
  STRESS_LABELS,
  SYMPTOM_OPTIONS,
} from "@/lib/constants";
import { toISODate, today } from "@/lib/dates";

/**
 * The "Log today" form — the app's core data-entry surface.
 *
 * Design decisions worth noting:
 *
 *  - Symptoms and moods are serialised with hidden inputs rather than hidden
 *    checkboxes. The visible control is a proper button (correct focus ring and
 *    touch target); the hidden input carries the value. This keeps the markup
 *    simple without sacrificing accessibility.
 *  - Intensity only appears for symptoms that are actually selected, so the form
 *    does not present 11 sliders for a day with no symptoms.
 *  - Sexual-health logging is collapsed AND off by default. Sensitive data
 *    should be opted into deliberately, never collected as a side effect of
 *    tapping "save".
 *  - Every field is optional. A log with only a mood is still a valid log.
 */

export interface ExistingLog {
  symptoms: { type: string; severity: number | null }[];
  moods: string[];
  notes: string | null;
  wellness: {
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
  intimate: {
    activityType: string | null;
    protectionUsed: boolean | null;
    notes: string | null;
  } | null;
}

export function DailyLogForm({
  date,
  existing,
}: {
  date?: string;
  existing: ExistingLog | null;
}) {
  const [state, formAction] = useActionState(saveDailyLogAction, IDLE_STATE);
  const [deleteState, deleteAction] = useActionState(deleteDailyLogAction, IDLE_STATE);

  const todayIso = toISODate(today());
  const [logDate, setLogDate] = useState(date ?? todayIso);

  const [symptoms, setSymptoms] = useState<Record<string, number | null>>(() => {
    const initial: Record<string, number | null> = {};
    for (const entry of existing?.symptoms ?? []) {
      initial[entry.type] = entry.severity;
    }
    return initial;
  });

  const [moods, setMoods] = useState<string[]>(existing?.moods ?? []);
  const [severityOpenFor, setSeverityOpenFor] = useState<string | null>(null);

  const [energy, setEnergy] = useState<number | null>(existing?.wellness?.energy ?? null);
  const [stress, setStress] = useState<number | null>(existing?.wellness?.stress ?? null);
  const [sleepQuality, setSleepQuality] = useState<number | null>(
    existing?.wellness?.sleepQuality ?? null,
  );

  const [intimateEnabled, setIntimateEnabled] = useState(Boolean(existing?.intimate));

  const selectedSymptoms = Object.keys(symptoms);

  function toggleSymptom(type: string) {
    setSymptoms((prev) => {
      if (type in prev) {
        const next = { ...prev };
        delete next[type];
        return next;
      }
      return { ...prev, [type]: null };
    });
  }

  // Group symptoms so the list scans as sections rather than 11 equal chips.
  const symptomGroups = SYMPTOM_OPTIONS.reduce<Record<string, typeof SYMPTOM_OPTIONS[number][]>>(
    (acc, option) => {
      acc[option.group] = acc[option.group] ?? [];
      acc[option.group].push(option);
      return acc;
    },
    {},
  );

  // A stale success message after the user edits again is confusing.
  const [savedAt, setSavedAt] = useState<string | null>(null);
  useEffect(() => {
    if (state.status === "success") setSavedAt(new Date().toISOString());
  }, [state.status, state.message]);

  return (
    <form action={formAction} className="space-y-5">
      <FormMessage state={state} />
      <FormMessage state={deleteState} />

      <input type="hidden" name="date" value={logDate} />
      {selectedSymptoms.map((type) => (
        <input key={type} type="hidden" name="symptoms" value={type} />
      ))}
      {moods.map((mood) => (
        <input key={mood} type="hidden" name="moods" value={mood} />
      ))}

      {/* ---------------------------------------------------------------- */}
      {/* Date                                                              */}
      {/* ---------------------------------------------------------------- */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="log-date">Which day?</Label>
              <Input
                id="log-date"
                type="date"
                value={logDate}
                max={todayIso}
                onChange={(event) => setLogDate(event.target.value)}
                className="w-44"
              />
            </div>
            <p className="pb-2.5 text-xs leading-relaxed text-muted-foreground">
              You can backfill past days. Everything is optional — save whatever
              you have.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------------- */}
      {/* Symptoms                                                          */}
      {/* ---------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Symptoms</CardTitle>
          <CardDescription>
            Select anything you noticed. Add an intensity only if it is useful to
            you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(symptomGroups).map(([group, options]) => (
            <div key={group} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group}
              </p>
              <div className="flex flex-wrap gap-2">
                {options.map((option) => {
                  const selected = option.value in symptoms;
                  return (
                    <ChipToggle
                      key={option.value}
                      label={option.label}
                      selected={selected}
                      tone={option.value === "OTHER" ? "blue" : "rose"}
                      onClick={() => {
                        toggleSymptom(option.value);
                        setSeverityOpenFor(selected ? null : option.value);
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* Intensity, only for selected symptoms. */}
          {selectedSymptoms.length > 0 ? (
            <div className="space-y-3 rounded-2xl border border-border bg-muted/40 p-4">
              <p className="text-sm font-medium">Intensity (optional)</p>
              {selectedSymptoms.map((type) => {
                const label =
                  SYMPTOM_OPTIONS.find((o) => o.value === type)?.label ?? type;
                const isOpen = severityOpenFor === type;

                return (
                  <div key={type} className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => setSeverityOpenFor(isOpen ? null : type)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-2 text-left"
                    >
                      <span className="text-sm text-muted-foreground">
                        {label}
                        {symptoms[type] ? ` — ${SEVERITY_LABELS[symptoms[type] as number]}` : ""}
                      </span>
                      <ChevronDown
                        className={`size-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      />
                    </button>

                    {isOpen ? (
                      <RatingInput
                        name={`severity_${type}`}
                        value={symptoms[type]}
                        labels={SEVERITY_LABELS}
                        onChange={(next) =>
                          setSymptoms((prev) => ({ ...prev, [type]: next }))
                        }
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------------- */}
      {/* Mood                                                              */}
      {/* ---------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Mood</CardTitle>
          <CardDescription>
            Pick as many as fit. Lunara shows the distribution later rather than
            scoring it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {MOOD_OPTIONS.map((option) => (
              <ChipToggle
                key={option.value}
                label={option.label}
                selected={moods.includes(option.value)}
                onClick={() =>
                  setMoods((prev) =>
                    prev.includes(option.value)
                      ? prev.filter((m) => m !== option.value)
                      : [...prev, option.value],
                  )
                }
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------------- */}
      {/* Body and lifestyle                                                */}
      {/* ---------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Body and lifestyle</CardTitle>
          <CardDescription>
            All optional. These chart alongside your cycle in Insights.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Weight" htmlFor="weight" hint="kg">
              <Input
                id="weight"
                name="weight"
                type="number"
                step="0.1"
                min={20}
                max={400}
                inputMode="decimal"
                defaultValue={existing?.wellness?.weight ?? ""}
                placeholder="—"
              />
            </Field>

            <Field
              label="Basal temperature"
              htmlFor="temperature"
              hint="°C. Most useful measured at the same time each morning."
            >
              <Input
                id="temperature"
                name="temperature"
                type="number"
                step="0.01"
                min={30}
                max={45}
                inputMode="decimal"
                defaultValue={existing?.wellness?.temperature ?? ""}
                placeholder="—"
              />
            </Field>

            <Field label="Sleep duration" htmlFor="sleep" hint={`hours, target around ${DAILY_GOALS.SLEEP_HOURS}`}>
              <Input
                id="sleep"
                name="sleep"
                type="number"
                step="0.25"
                min={0}
                max={24}
                inputMode="decimal"
                defaultValue={existing?.wellness?.sleep ?? ""}
                placeholder="—"
              />
            </Field>

            <Field label="Water intake" htmlFor="water" hint="millilitres">
              <Input
                id="water"
                name="water"
                type="number"
                step="50"
                min={0}
                max={10000}
                inputMode="numeric"
                defaultValue={existing?.wellness?.water ?? ""}
                placeholder="—"
              />
            </Field>

            <Field label="Exercise" htmlFor="exerciseMinutes" hint="minutes of movement">
              <Input
                id="exerciseMinutes"
                name="exerciseMinutes"
                type="number"
                min={0}
                max={1440}
                inputMode="numeric"
                defaultValue={existing?.wellness?.exerciseMinutes ?? ""}
                placeholder="—"
              />
            </Field>

            <div className="space-y-1.5">
              <Label htmlFor="exercise">How hard did it feel?</Label>
              <select
                id="exercise"
                name="exercise"
                defaultValue={existing?.wellness?.exercise ?? ""}
                className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-base shadow-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30 sm:text-sm"
              >
                <option value="">Not specified</option>
                {EXERCISE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-5 border-t border-border pt-5 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Energy</Label>
              <RatingInput
                name="energy"
                value={energy}
                onChange={setEnergy}
                labels={ENERGY_LABELS}
              />
            </div>
            <div className="space-y-2">
              <Label>Stress</Label>
              <RatingInput
                name="stress"
                value={stress}
                onChange={setStress}
                labels={STRESS_LABELS}
              />
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
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------------- */}
      {/* Sexual health (private, opt-in)                                   */}
      {/* ---------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="size-4 text-muted-foreground" aria-hidden="true" />
            Sexual health
          </CardTitle>
          <CardDescription>
            Private and optional. Never shown to anyone else, excluded from
            aggregate statistics unless you opt in, and never included in the
            education hub or admin reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              name="intimateLogged"
              checked={intimateEnabled}
              onChange={(event) => setIntimateEnabled(event.target.checked)}
              className="sr-only"
            />
            <span
              className={`flex size-5 items-center justify-center rounded-md border transition-colors ${
                intimateEnabled
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background"
              }`}
              aria-hidden="true"
            >
              {intimateEnabled ? (
                <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : null}
            </span>
            <span className="text-sm">Record something for this day</span>
          </label>

          {intimateEnabled ? (
            <div className="grid gap-4 rounded-2xl border border-border bg-muted/40 p-4 sm:grid-cols-2">
              <Field label="Activity" htmlFor="intimateActivityType">
                <Input
                  id="intimateActivityType"
                  name="intimateActivityType"
                  type="text"
                  maxLength={80}
                  defaultValue={existing?.intimate?.activityType ?? ""}
                  placeholder="Optional"
                />
              </Field>

              <div className="space-y-1.5">
                <Label htmlFor="intimateProtection">Protection</Label>
                <select
                  id="intimateProtection"
                  name="intimateProtection"
                  defaultValue={
                    existing?.intimate?.protectionUsed === true
                      ? "true"
                      : existing?.intimate?.protectionUsed === false
                        ? "false"
                        : ""
                  }
                  className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-base shadow-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30 sm:text-sm"
                >
                  <option value="">Not specified</option>
                  <option value="true">Used</option>
                  <option value="false">Not used</option>
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="intimateNotes">Notes</Label>
                <Textarea
                  id="intimateNotes"
                  name="intimateNotes"
                  rows={2}
                  maxLength={2000}
                  defaultValue={existing?.intimate?.notes ?? ""}
                  placeholder="Private to your account"
                />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------------- */}
      {/* Notes                                                             */}
      {/* ---------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
          <CardDescription>Anything else you want to remember about today.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            name="notes"
            rows={3}
            maxLength={2000}
            defaultValue={existing?.notes ?? ""}
            placeholder="Anything at all — sleep, stress, food, how the day went"
            aria-label="Notes for this day"
          />
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------------- */}
      {/* Actions                                                           */}
      {/* ---------------------------------------------------------------- */}
      <div className="sticky bottom-20 z-20 flex flex-wrap items-center gap-3 rounded-3xl border border-border bg-card/90 p-4 shadow-lift backdrop-blur md:bottom-4">
        <SubmitButton size="lg" pendingLabel="Saving…">
          <Save aria-hidden="true" />
          Save log
        </SubmitButton>

        <p className="text-xs text-muted-foreground">
          Saved to {toISODate(logDate)}
          {savedAt ? " · up to date" : ""}
        </p>

        {existing ? (
          <Button
            type="button"
            variant="destructiveOutline"
            size="sm"
            className="ml-auto"
            onClick={() => {
              if (confirm("Remove everything logged for this day?")) {
                const data = new FormData();
                data.set("date", logDate);
                deleteAction(data);
              }
            }}
          >
            <Trash2 aria-hidden="true" />
            Clear this day
          </Button>
        ) : null}
      </div>

      <Alert variant="medical">
        <AlertDescription>
          Lunara records what you tell it and looks for patterns. It does not
          diagnose anything. If you have severe pain, very heavy bleeding, or
          symptoms that worry you, please speak to a doctor or midwife.
        </AlertDescription>
      </Alert>
    </form>
  );
}
