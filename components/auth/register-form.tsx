"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { registerAction } from "@/lib/actions/auth-actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import {
  PasswordRequirements,
  isPasswordPolicySatisfied,
} from "@/components/forms/password-requirements";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { REQUIRED_SECURITY_QUESTION_COUNT } from "@/lib/constants";

export interface SecurityQuestionOption {
  id: string;
  question: string;
}

/**
 * Registration form.
 *
 * Security questions are required at sign-up because they are the only
 * account-recovery factor in this build (no email provider is configured). The
 * number collected is driven by `REQUIRED_SECURITY_QUESTION_COUNT`, so this form
 * does not need editing to change how many questions are asked.
 *
 * Two deliberate UX decisions:
 *
 *  1. Rows are rendered from the constant, never hard-coded, so the form cannot
 *     drift out of step with what the server validates.
 *  2. The answer is a plain text input with a note about what happens to it.
 *     Concealing it behind dots would encourage short, unmemorable answers, and
 *     the real protection is that it is hashed — not hidden.
 */
export function RegisterForm({
  questions,
}: {
  questions: SecurityQuestionOption[];
}) {
  const [state, formAction] = useActionState(registerAction, IDLE_STATE);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // One slot per required question, derived rather than hard-coded.
  const [selected, setSelected] = useState<string[]>(() =>
    Array.from({ length: REQUIRED_SECURITY_QUESTION_COUNT }, () => ""),
  );

  const policySatisfied = isPasswordPolicySatisfied(password);
  const mismatch = confirm.length > 0 && confirm !== password;

  // Ready when every slot has a distinct choice. The Set check keeps the
  // no-duplicates rule meaningful if this is ever raised above one question.
  const questionsReady =
    selected.length === REQUIRED_SECURITY_QUESTION_COUNT &&
    selected.every((id) => id !== "") &&
    new Set(selected).size === REQUIRED_SECURITY_QUESTION_COUNT;

  function setQuestionAt(index: number, value: string) {
    setSelected((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <FormMessage state={state} />

      {/* --- Account details ------------------------------------------- */}
      <fieldset className="space-y-4">
        <legend className="pb-1 font-display text-base font-semibold">Your account</legend>

        <Field label="Full name" htmlFor="name" required error={state.fieldErrors?.name}>
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            placeholder="Alex Morgan"
            aria-invalid={Boolean(state.fieldErrors?.name) || undefined}
          />
        </Field>

        <Field label="Email" htmlFor="email" required error={state.fieldErrors?.email}>
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

        <Field label="Password" htmlFor="password" required>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              placeholder="Create a password"
              className="pr-11"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(state.fieldErrors?.password) || undefined}
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
          {state.fieldErrors?.password ? (
            <p role="alert" className="text-xs font-medium text-destructive">
              {state.fieldErrors.password}
            </p>
          ) : null}
        </Field>

        <Field
          label="Confirm password"
          htmlFor="confirmPassword"
          required
          error={
            state.fieldErrors?.confirmPassword ??
            (mismatch ? "Those passwords do not match." : undefined)
          }
        >
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            placeholder="Repeat your password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            aria-invalid={Boolean(state.fieldErrors?.confirmPassword) || mismatch || undefined}
          />
        </Field>
      </fieldset>

      {/* --- Security questions ---------------------------------------- */}
      <fieldset className="space-y-4 border-t border-border pt-6">
        <legend className="pb-1 font-display text-base font-semibold">
          Account recovery questions
        </legend>

        <Alert variant="info">
          <ShieldCheck aria-hidden="true" />
          <AlertTitle>Why we ask</AlertTitle>
          <AlertDescription>
            These are how you get back into your account if you forget your
            password. Answers are normalised and hashed before they are stored —
            they are never saved or sent back as plain text.
          </AlertDescription>
        </Alert>

        <p className="text-xs leading-relaxed text-muted-foreground">
          {REQUIRED_SECURITY_QUESTION_COUNT === 1
            ? "Pick one question and give an answer you will still remember in a year. Pick something specific to you rather than something a friend could guess."
            : `Choose ${REQUIRED_SECURITY_QUESTION_COUNT} different questions and answers you will still remember in a year.`}{" "}
          Answers are not case-sensitive and extra spaces are ignored.
        </p>

        {Array.from({ length: REQUIRED_SECURITY_QUESTION_COUNT }, (_, index) => index).map((index) => {
          const usedElsewhere = selected.filter((id, i) => id !== "" && i !== index);
          return (
            <div key={index} className="space-y-2 rounded-2xl border border-border bg-muted/40 p-3.5">
              <Field
                label={
                  REQUIRED_SECURITY_QUESTION_COUNT === 1
                    ? "Your recovery question"
                    : `Question ${index + 1}`
                }
                htmlFor={`questionId_${index}`}
                required
              >
                <NativeSelect
                  id={`questionId_${index}`}
                  name={`questionId_${index}`}
                  required
                  value={selected[index]}
                  onChange={(event) => setQuestionAt(index, event.target.value)}
                  aria-invalid={Boolean(state.fieldErrors?.securityAnswers) || undefined}
                >
                  <option value="" disabled>
                    Choose a question…
                  </option>
                  {questions.map((q) => (
                    <option
                      key={q.id}
                      value={q.id}
                      disabled={usedElsewhere.includes(q.id)}
                    >
                      {q.question}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field
                label="Your answer"
                htmlFor={`answer_${index}`}
                required
                hint="Stored as a one-way hash."
              >
                <Input
                  id={`answer_${index}`}
                  name={`answer_${index}`}
                  type="text"
                  autoComplete="off"
                  required
                  maxLength={200}
                  placeholder="Your answer"
                />
              </Field>
            </div>
          );
        })}

        {state.fieldErrors?.securityAnswers ? (
          <p role="alert" className="text-xs font-medium text-destructive">
            {state.fieldErrors.securityAnswers}
          </p>
        ) : null}
      </fieldset>

      {/* --- Consent ---------------------------------------------------- */}
      <div className="flex items-start gap-3 border-t border-border pt-6">
        <Checkbox id="acceptTerms" name="acceptTerms" required className="mt-0.5" />
        <Label htmlFor="acceptTerms" className="items-start font-normal leading-relaxed">
          <span className="text-sm text-muted-foreground">
            I understand Lunara is a tracking and wellness tool. It calculates
            estimates from what I record, and it does not diagnose conditions or
            replace medical advice.
          </span>
        </Label>
      </div>
      {state.fieldErrors?.acceptTerms ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {state.fieldErrors.acceptTerms}
        </p>
      ) : null}

      <SubmitButton
        block
        size="lg"
        pendingLabel="Creating your account…"
        disabled={!policySatisfied || mismatch || !questionsReady}
      >
        Create account
      </SubmitButton>
    </form>
  );
}
