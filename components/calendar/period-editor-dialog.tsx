"use client";

import { useActionState, useEffect } from "react";
import { CalendarCheck, Trash2 } from "lucide-react";
import {
  deletePeriodAction,
  endPeriodAction,
  savePeriodAction,
} from "@/lib/actions/cycle-actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toISODate, today } from "@/lib/dates";

/**
 * Add, edit, or delete a period entry for a specific day.
 *
 * Three independent forms share this dialog:
 *   - save    : create or update the entry (upsert on the start date)
 *   - end     : close the most recent open period on this date
 *   - delete  : remove the entry entirely
 *
 * The dialog closes itself when a submission reports success. That is driven by
 * the action's returned state rather than by a router event, so it stays correct
 * even if the server re-render is batched differently.
 */

export interface ExistingPeriod {
  id: string;
  startDate: Date;
  endDate: Date | null;
  notes: string | null;
}

export function PeriodEditorDialog({
  open,
  onOpenChange,
  date,
  existingPeriod,
  hasOpenPeriod,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The day the user tapped, as `YYYY-MM-DD`. */
  date: string;
  /** The recorded entry starting on that day, if any. */
  existingPeriod: ExistingPeriod | null;
  /** Whether some period is currently open-ended. */
  hasOpenPeriod: boolean;
}) {
  const [saveState, saveAction] = useActionState(savePeriodAction, IDLE_STATE);
  const [deleteState, deleteAction] = useActionState(deletePeriodAction, IDLE_STATE);
  const [endState, endAction] = useActionState(endPeriodAction, IDLE_STATE);

  const anySuccess =
    saveState.status === "success" ||
    deleteState.status === "success" ||
    endState.status === "success";

  useEffect(() => {
    if (anySuccess) onOpenChange(false);
  }, [anySuccess, onOpenChange]);

  const todayIso = toISODate(today());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {existingPeriod ? "Edit period" : "Record a period"}
          </DialogTitle>
          <DialogDescription>
            Dates are recorded as calendar days, so no timezone conversion is
            applied to them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormMessage state={saveState} />
          <FormMessage state={deleteState} />
          <FormMessage state={endState} />

          {/* --- Create / update ---------------------------------------- */}
          <form action={saveAction} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="period-start">First day</Label>
                <Input
                  id="period-start"
                  name="startDate"
                  type="date"
                  required
                  max={todayIso}
                  defaultValue={date}
                  aria-invalid={Boolean(saveState.fieldErrors?.startDate) || undefined}
                />
                {saveState.fieldErrors?.startDate ? (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {saveState.fieldErrors.startDate}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="period-end">Last day</Label>
                <Input
                  id="period-end"
                  name="endDate"
                  type="date"
                  max={todayIso}
                  defaultValue={
                    existingPeriod?.endDate ? toISODate(existingPeriod.endDate) : ""
                  }
                  aria-invalid={Boolean(saveState.fieldErrors?.endDate) || undefined}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank if the period is still ongoing.
                </p>
                {saveState.fieldErrors?.endDate ? (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {saveState.fieldErrors.endDate}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="period-notes">Notes</Label>
              <Textarea
                id="period-notes"
                name="notes"
                rows={2}
                maxLength={2000}
                defaultValue={existingPeriod?.notes ?? ""}
                placeholder="Optional — flow, clotting, anything you want to remember"
              />
            </div>

            <SubmitButton block pendingLabel="Saving…">
              {existingPeriod ? "Save changes" : "Record period"}
            </SubmitButton>
          </form>

          {/* --- Close an open period ---------------------------------- */}
          {hasOpenPeriod ? (
            <>
              <Separator />
              <form action={endAction} className="space-y-3">
                <input type="hidden" name="endDate" value={date} />
                <p className="text-sm text-muted-foreground">
                  Mark the most recent period as ending on this day.
                </p>
                <Button type="submit" variant="outline" size="sm" block>
                  <CalendarCheck aria-hidden="true" />
                  Period ended on this day
                </Button>
              </form>
            </>
          ) : null}

          {/* --- Delete ------------------------------------------------ */}
          {existingPeriod ? (
            <>
              <Separator />
              <form action={deleteAction}>
                <input type="hidden" name="id" value={existingPeriod.id} />
                <Button type="submit" variant="destructiveOutline" size="sm" block>
                  <Trash2 aria-hidden="true" />
                  Delete this entry
                </Button>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Deleting an entry recalculates your cycle lengths and every
                  estimate that depends on them.
                </p>
              </form>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
