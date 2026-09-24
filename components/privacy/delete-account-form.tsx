"use client";

import { useActionState, useState } from "react";
import { Trash2, TriangleAlert } from "lucide-react";
import { deleteAccountAction } from "@/lib/actions/auth-actions";
import { clearTrackingDataAction } from "@/lib/actions/privacy-actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Field } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

/**
 * Destructive data controls.
 *
 * Two separate operations, deliberately presented as two:
 *   1. clear tracking data — keeps the account and login
 *   2. delete the account  — removes everything and anonymises the user row
 *
 * Both require typing a confirmation phrase, because neither is recoverable.
 * The account-deletion flow additionally requires the password: typing a word
 * proves intent, but the password proves identity, and on a borrowed device the
 * two are not the same thing.
 */
export function DeleteAccountForm() {
  const [deleteState, deleteAction] = useActionState(deleteAccountAction, IDLE_STATE);
  const [clearState, clearAction] = useActionState(clearTrackingDataAction, IDLE_STATE);

  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [clearPhrase, setClearPhrase] = useState("");

  return (
    <div className="space-y-6">
      <FormMessage state={deleteState} />
      <FormMessage state={clearState} />

      {/* ---- Clear tracking data ---------------------------------------- */}
      <form action={clearAction} className="space-y-4">
        <div>
          <p className="text-sm font-semibold">Clear tracking data</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Removes every period, cycle, daily log, symptom, mood, wellness entry,
            private log, fertility record, and pregnancy record. Your account,
            email, password, and recovery questions stay exactly as they are.
          </p>
        </div>

        <Field
          label="Type CLEAR to confirm"
          htmlFor="clearPhrase"
          required
          error={clearState.fieldErrors?.confirmPhrase}
        >
          <Input
            id="clearPhrase"
            name="confirmPhrase"
            type="text"
            required
            autoComplete="off"
            value={clearPhrase}
            onChange={(event) => setClearPhrase(event.target.value)}
            placeholder="CLEAR"
            aria-invalid={Boolean(clearState.fieldErrors?.confirmPhrase) || undefined}
          />
        </Field>

        <SubmitButton
          variant="outline"
          pendingLabel="Clearing…"
          disabled={clearPhrase !== "CLEAR"}
        >
          <Trash2 aria-hidden="true" />
          Clear all tracking data
        </SubmitButton>
      </form>

      <Separator />

      {/* ---- Delete account --------------------------------------------- */}
      <form action={deleteAction} className="space-y-4">
        <Alert variant="destructive">
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>Delete account</AlertTitle>
          <AlertDescription>
            This permanently removes everything above, plus your reminders,
            notifications, security questions, and sessions. You will be signed
            out immediately and cannot undo it. Consider exporting your data
            first.
          </AlertDescription>
        </Alert>

        <Field
          label="Type DELETE to confirm"
          htmlFor="confirmPhrase"
          required
          error={deleteState.fieldErrors?.confirmPhrase}
        >
          <Input
            id="confirmPhrase"
            name="confirmPhrase"
            type="text"
            required
            autoComplete="off"
            value={confirmPhrase}
            onChange={(event) => setConfirmPhrase(event.target.value)}
            placeholder="DELETE"
            aria-invalid={Boolean(deleteState.fieldErrors?.confirmPhrase) || undefined}
          />
        </Field>

        <Field
          label="Your password"
          htmlFor="deletePassword"
          required
          error={deleteState.fieldErrors?.password}
          hint="Confirms it is really you, not just someone at an unlocked device."
        >
          <Input
            id="deletePassword"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            aria-invalid={Boolean(deleteState.fieldErrors?.password) || undefined}
          />
        </Field>

        <SubmitButton
          variant="destructive"
          pendingLabel="Deleting…"
          disabled={confirmPhrase !== "DELETE"}
        >
          <Trash2 aria-hidden="true" />
          Permanently delete my account
        </SubmitButton>
      </form>

      <div className="rounded-2xl bg-muted/50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          What deletion actually does
        </p>
        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
          <li>Every health record you created is deleted from the database.</li>
          <li>All sessions are revoked, so no device stays signed in.</li>
          <li>
            The user row itself is anonymised rather than removed: the email is
            replaced with a non-routable placeholder and the password hash is
            overwritten with random data, so the account can never authenticate
            again.
          </li>
          <li>
            This is why re-registering with the same address later starts from a
            genuinely empty account.
          </li>
        </ul>
      </div>
    </div>
  );
}
