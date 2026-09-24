"use client";

import { useActionState } from "react";
import { CalendarPlus, Droplet } from "lucide-react";
import { markPeriodStartAction } from "@/lib/actions/cycle-actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toISODate, today } from "@/lib/dates";

/**
 * One-tap "my period started" action.
 *
 * This is the highest-frequency write in the app, so it is deliberately the
 * lowest-friction: a single primary button that records today with no other
 * input. The date field and the "close previous period" option are tucked behind
 * a disclosure for the less common case of backfilling history.
 */
export function QuickPeriodCard({
  hasOpenPeriod,
  lastPeriodStart,
}: {
  hasOpenPeriod: boolean;
  lastPeriodStart: Date | null;
}) {
  const [state, formAction] = useActionState(markPeriodStartAction, IDLE_STATE);
  const todayIso = toISODate(today());

  return (
    <div className="space-y-4">
      <FormMessage state={state} />

      {/* Primary path: log today in one tap. */}
      <form action={formAction}>
        <input type="hidden" name="date" value={todayIso} />
        {hasOpenPeriod ? (
          <input type="hidden" name="endPreviousPeriod" value="on" />
        ) : null}
        <SubmitButton block size="lg" pendingLabel="Recording…">
          <Droplet aria-hidden="true" />
          My period started today
        </SubmitButton>
      </form>

      {lastPeriodStart ? (
        <p className="text-xs text-muted-foreground">
          Last recorded start: {toISODate(lastPeriodStart)}
        </p>
      ) : null}

      {/* Secondary path: a different date. */}
      <details className="group rounded-2xl border border-border bg-muted/40 px-4 py-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium marker:content-none">
          <CalendarPlus className="size-4 text-muted-foreground" aria-hidden="true" />
          Started on another date
        </summary>

        <form action={formAction} className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="quick-start-date">First day of the period</Label>
            <Input
              id="quick-start-date"
              name="date"
              type="date"
              defaultValue={todayIso}
              max={todayIso}
              required
            />
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="quick-end-previous"
              name="endPreviousPeriod"
              defaultChecked
              className="mt-0.5"
            />
            <Label htmlFor="quick-end-previous" className="items-start font-normal">
              <span className="text-sm text-muted-foreground">
                Close the previous period the day before this one
              </span>
            </Label>
          </div>

          <Button type="submit" variant="soft" size="sm">
            Record start date
          </Button>
        </form>
      </details>
    </div>
  );
}
