"use client";

import { useActionState } from "react";
import { forgotPasswordAction } from "@/lib/actions/auth-actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Step 2 of recovery: collect the email address.
 *
 * The wording below is deliberately non-committal. Whether or not the address is
 * registered, the next screen looks the same and the copy says "if an account
 * exists" — so this step cannot be used to discover who has an account.
 */
export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(forgotPasswordAction, IDLE_STATE);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <Alert variant="info">
        <AlertDescription>
          If an account exists with this email, you can continue with account
          recovery. You will need to answer the security question you chose
          when you signed up.
        </AlertDescription>
      </Alert>

      <FormMessage state={state} />

      <Field
        label="Email"
        htmlFor="email"
        required
        error={state.fieldErrors?.email}
        hint="Use the address you registered with."
      >
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="you@example.com"
          aria-invalid={Boolean(state.fieldErrors?.email) || undefined}
        />
      </Field>

      <SubmitButton block size="lg" pendingLabel="Checking…">
        Continue
      </SubmitButton>
    </form>
  );
}
