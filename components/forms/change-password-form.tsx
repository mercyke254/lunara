"use client";

import { useActionState, useState } from "react";
import { KeyRound } from "lucide-react";
import { changePasswordAction } from "@/lib/actions/auth-actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Field } from "@/components/forms/field";
import {
  PasswordRequirements,
  isPasswordPolicySatisfied,
} from "@/components/forms/password-requirements";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Change password for a signed-in user.
 *
 * Requires the current password: a borrowed unlocked device should not be enough
 * to lock the owner out of their own account. On success every session is
 * invalidated and the user is redirected to sign in again with the new
 * credentials — the safe default after a credential change.
 */
export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, IDLE_STATE);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const policySatisfied = isPasswordPolicySatisfied(newPassword);
  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;

  return (
    <form action={formAction} className="space-y-5">
      <FormMessage state={state} />

      <Field
        label="Current password"
        htmlFor="currentPassword"
        required
        error={state.fieldErrors?.currentPassword}
      >
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          aria-invalid={Boolean(state.fieldErrors?.currentPassword) || undefined}
        />
      </Field>

      <Field label="New password" htmlFor="newPassword" required>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          aria-invalid={Boolean(state.fieldErrors?.newPassword) || undefined}
        />
        <PasswordRequirements value={newPassword} />
        {state.fieldErrors?.newPassword ? (
          <p role="alert" className="text-xs font-medium text-destructive">
            {state.fieldErrors.newPassword}
          </p>
        ) : null}
      </Field>

      <Field
        label="Confirm new password"
        htmlFor="newPasswordConfirm"
        required
        error={
          state.fieldErrors?.confirmPassword ??
          (mismatch ? "Those passwords do not match." : undefined)
        }
      >
        <Input
          id="newPasswordConfirm"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          aria-invalid={Boolean(state.fieldErrors?.confirmPassword) || mismatch || undefined}
        />
      </Field>

      <Alert variant="warning">
        <KeyRound aria-hidden="true" />
        <AlertDescription>
          Changing your password signs you out of every device, including this
          one. You will need to sign in again with the new password.
        </AlertDescription>
      </Alert>

      <SubmitButton
        pendingLabel="Updating…"
        disabled={!policySatisfied || mismatch || confirmPassword.length === 0}
      >
        Change password
      </SubmitButton>
    </form>
  );
}
