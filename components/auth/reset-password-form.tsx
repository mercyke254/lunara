"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { resetPasswordAction } from "@/lib/actions/auth-actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import {
  PasswordRequirements,
  isPasswordPolicySatisfied,
} from "@/components/forms/password-requirements";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";

/**
 * Step 5 of recovery: choose the new password.
 *
 * The recovery token is intentionally NOT a form field. It travels in an
 * httpOnly cookie, so it never appears in the DOM, in a URL, or in browser
 * history — and a script on the page cannot read it.
 */
export function ResetPasswordForm() {
  const [state, formAction] = useActionState(resetPasswordAction, IDLE_STATE);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const policySatisfied = isPasswordPolicySatisfied(password);
  const mismatch = confirm.length > 0 && confirm !== password;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />

      <Field label="New password" htmlFor="newPassword" required>
        <div className="relative">
          <Input
            id="newPassword"
            name="newPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            placeholder="Choose a new password"
            className="pr-11"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(state.fieldErrors?.newPassword) || undefined}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
        <PasswordRequirements value={password} />
        {state.fieldErrors?.newPassword ? (
          <p role="alert" className="text-xs font-medium text-destructive">
            {state.fieldErrors.newPassword}
          </p>
        ) : null}
      </Field>

      <Field
        label="Confirm new password"
        htmlFor="confirmPassword"
        required
        error={state.fieldErrors?.confirmPassword ?? (mismatch ? "Those passwords do not match." : undefined)}
      >
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          placeholder="Repeat the new password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          aria-invalid={Boolean(state.fieldErrors?.confirmPassword) || mismatch || undefined}
        />
      </Field>

      <SubmitButton
        block
        size="lg"
        pendingLabel="Saving…"
        disabled={!policySatisfied || mismatch || confirm.length === 0}
      >
        Set new password
      </SubmitButton>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Setting a new password signs you out of every device. You will need to
        sign in again with the new password.
      </p>
    </form>
  );
}
