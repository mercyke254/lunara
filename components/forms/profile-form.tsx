"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { updateProfileAction } from "@/lib/actions/auth-actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Field } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { REGULARITY_OPTIONS } from "@/lib/constants";

/**
 * Profile and cycle defaults.
 *
 * Changing the average cycle length here affects every prediction, so the form
 * says so. These are the values used when there is not yet enough logged history
 * to measure them, which is exactly why they are worth getting roughly right.
 */
export function ProfileForm({
  defaultValues,
}: {
  defaultValues: {
    name: string;
    averageCycleLength: number;
    averagePeriodLength: number;
    cycleRegularity: string;
  };
}) {
  const [state, formAction] = useActionState(updateProfileAction, IDLE_STATE);

  return (
    <form action={formAction} className="space-y-5">
      <FormMessage state={state} />

      <Field label="Name" htmlFor="profile-name" required error={state.fieldErrors?.name}>
        <Input
          id="profile-name"
          name="name"
          type="text"
          required
          maxLength={100}
          defaultValue={defaultValues.name}
          autoComplete="name"
          aria-invalid={Boolean(state.fieldErrors?.name) || undefined}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Average cycle length"
          htmlFor="profile-cycle-length"
          hint="Days from the first day of one period to the day before the next."
          error={state.fieldErrors?.averageCycleLength}
        >
          <Input
            id="profile-cycle-length"
            name="averageCycleLength"
            type="number"
            min={15}
            max={90}
            required
            defaultValue={defaultValues.averageCycleLength}
            aria-invalid={Boolean(state.fieldErrors?.averageCycleLength) || undefined}
          />
        </Field>

        <Field
          label="Average period length"
          htmlFor="profile-period-length"
          hint="Days of bleeding."
          error={state.fieldErrors?.averagePeriodLength}
        >
          <Input
            id="profile-period-length"
            name="averagePeriodLength"
            type="number"
            min={1}
            max={14}
            required
            defaultValue={defaultValues.averagePeriodLength}
            aria-invalid={Boolean(state.fieldErrors?.averagePeriodLength) || undefined}
          />
        </Field>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="profile-regularity">How regular are your cycles?</Label>
        <NativeSelect
          id="profile-regularity"
          name="cycleRegularity"
          defaultValue={defaultValues.cycleRegularity}
        >
          {REGULARITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Once you have logged two or more cycles, Lunara measures regularity from
          your own data and this setting stops being used.
        </p>
      </div>

      <SubmitButton pendingLabel="Saving…">
        <Save aria-hidden="true" />
        Save profile
      </SubmitButton>
    </form>
  );
}
