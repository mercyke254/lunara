"use client";

import { useActionState } from "react";
import { BellRing, Trash2 } from "lucide-react";
import {
  deleteReminderAction,
  saveReminderAction,
  toggleReminderAction,
} from "@/lib/actions/reminder-actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { REMINDER_TYPE_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Per-type reminder configuration.
 *
 * Each reminder type gets its own row and its own set of forms, which is what
 * makes "enabled/disabled individually" real rather than cosmetic:
 *
 *   - the switch is its own single-button form, so toggling is one tap and
 *     cannot accidentally save an unrelated half-edited schedule
 *   - the schedule (time, lead time, label) is a separate form with an explicit
 *     save
 *
 * `aria-checked` on the switch means assistive tech announces it as a switch
 * rather than a button, and the change is announced through the shared
 * FormMessage.
 */

export interface ReminderRecord {
  id: string;
  type: string;
  enabled: boolean;
  label: string | null;
  timeOfDay: string;
  leadTimeDays: number;
}

export function ReminderManager({ reminders }: { reminders: ReminderRecord[] }) {
  const [toggleState, toggleAction] = useActionState(toggleReminderAction, IDLE_STATE);
  const [saveState, saveAction] = useActionState(saveReminderAction, IDLE_STATE);
  const [deleteState, deleteAction] = useActionState(deleteReminderAction, IDLE_STATE);

  const byType = new Map(reminders.map((reminder) => [reminder.type, reminder]));

  return (
    <div className="space-y-5">
      <FormMessage state={toggleState} />
      <FormMessage state={saveState} />
      <FormMessage state={deleteState} />

      <ul className="space-y-3">
        {REMINDER_TYPE_OPTIONS.map((option) => {
          const existing = byType.get(option.value);
          const enabled = existing?.enabled ?? false;

          return (
            <li
              key={option.value}
              className={cn(
                "rounded-2xl border p-4 transition-colors",
                enabled ? "border-primary/40 bg-primary-soft/30" : "border-border bg-card",
              )}
            >
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{option.label}</p>
                    {existing ? (
                      <Badge variant={enabled ? "success" : "outline"} className="font-normal">
                        {enabled ? "On" : "Off"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="font-normal">
                        Not set up
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {option.description}
                  </p>
                </div>

                {/* Toggle: a single-purpose form. */}
                <form action={toggleAction} className="shrink-0">
                  <input type="hidden" name="type" value={option.value} />
                  <input type="hidden" name="enabled" value={enabled ? "false" : "on"} />
                  <button
                    type="submit"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={`${option.label}: ${enabled ? "on" : "off"}. Activate to turn ${enabled ? "off" : "on"}.`}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full border-2 border-transparent transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2",
                      enabled ? "bg-primary" : "bg-input",
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none block size-5 rounded-full bg-white shadow-sm transition-transform",
                        enabled ? "translate-x-5" : "translate-x-0",
                      )}
                    />
                  </button>
                </form>
              </div>

              {/* Schedule */}
              <form action={saveAction} className="mt-4 space-y-3 border-t border-border pt-4">
                <input type="hidden" name="type" value={option.value} />
                <input type="hidden" name="enabled" value={enabled ? "on" : "false"} />

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`time-${option.value}`}>Time</Label>
                    <Input
                      id={`time-${option.value}`}
                      name="timeOfDay"
                      type="time"
                      defaultValue={existing?.timeOfDay ?? "09:00"}
                      required
                    />
                  </div>

                  {option.supportsLeadTime ? (
                    <div className="space-y-1.5">
                      <Label htmlFor={`lead-${option.value}`}>Days ahead</Label>
                      <Input
                        id={`lead-${option.value}`}
                        name="leadTimeDays"
                        type="number"
                        min={0}
                        max={30}
                        defaultValue={existing?.leadTimeDays ?? 0}
                      />
                    </div>
                  ) : (
                    <input type="hidden" name="leadTimeDays" value="0" />
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor={`label-${option.value}`}>Label</Label>
                    <Input
                      id={`label-${option.value}`}
                      name="label"
                      type="text"
                      maxLength={80}
                      defaultValue={existing?.label ?? ""}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <SubmitButton size="sm" variant="soft" pendingLabel="Saving…">
                    <BellRing aria-hidden="true" />
                    Save
                  </SubmitButton>

                  {existing ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm(`Remove the ${option.label.toLowerCase()} reminder?`)) {
                          const data = new FormData();
                          data.set("type", option.value);
                          deleteAction(data);
                        }
                      }}
                    >
                      <Trash2 aria-hidden="true" />
                      Remove
                    </Button>
                  ) : null}
                </div>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
