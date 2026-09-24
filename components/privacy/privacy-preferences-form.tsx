"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { updatePrivacyPreferencesAction } from "@/lib/actions/auth-actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PRIVACY_PREFERENCE_OPTIONS } from "@/lib/constants";

/**
 * Privacy preferences.
 *
 * Two independent switches, and both default to the privacy-preserving choice:
 * anonymous statistics off, and notifications on (which only ever produces
 * in-app records the user asked for).
 *
 * The copy explaining the anonymous-statistics switch is deliberately specific
 * about what would be shared, because "anonymous" is a word users have learned
 * not to trust.
 */
export function PrivacyPreferencesForm({
  defaultValues,
}: {
  defaultValues: {
    shareAnonymousStats: boolean;
    notificationsEnabled: boolean;
  };
}) {
  const [state, formAction] = useActionState(
    updatePrivacyPreferencesAction,
    IDLE_STATE,
  );

  const anonymousStats = PRIVACY_PREFERENCE_OPTIONS[0];

  return (
    <form action={formAction} className="space-y-5">
      <FormMessage state={state} />

      <div className="flex items-start gap-3">
        <Checkbox
          id="shareAnonymousStats"
          name="shareAnonymousStats"
          defaultChecked={defaultValues.shareAnonymousStats}
          className="mt-0.5"
        />
        <Label htmlFor="shareAnonymousStats" className="items-start font-normal">
          <span>
            <span className="block text-sm font-medium">{anonymousStats.label}</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
              {anonymousStats.description} Counts only — never your name, email,
              notes, or an individual log entry.
            </span>
          </span>
        </Label>
      </div>

      <div className="flex items-start gap-3 border-t border-border pt-5">
        <Checkbox
          id="notificationsEnabled"
          name="notificationsEnabled"
          defaultChecked={defaultValues.notificationsEnabled}
          className="mt-0.5"
        />
        <Label htmlFor="notificationsEnabled" className="items-start font-normal">
          <span>
            <span className="block text-sm font-medium">
              Allow reminders to create notifications
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
              Master switch for the reminders screen. Individual reminder types
              still have their own switches there.
            </span>
          </span>
        </Label>
      </div>

      <SubmitButton pendingLabel="Saving…">
        <Save aria-hidden="true" />
        Save preferences
      </SubmitButton>
    </form>
  );
}
