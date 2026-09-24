"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { loginAction } from "@/lib/actions/auth-actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(loginAction, IDLE_STATE);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {/* Preserves the post-login destination across a failed attempt. */}
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <FormMessage state={state} />

      <Field label="Email" htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="you@example.com"
          aria-invalid={state.status === "error" ? true : undefined}
        />
      </Field>

      <Field label="Password" htmlFor="password" required>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="Your password"
            className="pr-11"
            aria-invalid={state.status === "error" ? true : undefined}
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
      </Field>

      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Forgot password?
        </Link>
      </div>

      <SubmitButton block size="lg" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
