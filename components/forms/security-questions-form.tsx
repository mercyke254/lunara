"use client";

import { useActionState, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { updateSecurityQuestionsAction } from "@/lib/actions/auth-actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Field } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { REQUIRED_SECURITY_QUESTION_COUNT } from "@/lib/constants";

export interface SecurityQuestionOption {
  id: string;
  question: string;
}

/**
 * Replace the security questions used for account recovery.
 *
 * Requires the current password, because these questions are a recovery factor —
 * if someone could change them from a borrowed session, they could take over the
 * account permanently.
 *
 * All three must be supplied at once. A partial update could leave the account
 * with fewer than three answers, which would break recovery entirely.
 */
export function SecurityQuestionsForm({
  questions,
  currentQuestionIds,
}: {
  questions: SecurityQuestionOption[];
  currentQuestionIds: string[];
}) {
  const [state, formAction] = useActionState(updateSecurityQuestionsAction, IDLE_STATE);
  const [selected, setSelected] = useState<string[]>(
    currentQuestionIds.length === REQUIRED_SECURITY_QUESTION_COUNT
      ? currentQuestionIds
      : ["", "", ""],
  );

  const distinct =
    selected.every((id) => id !== "") && new Set(selected).size === REQUIRED_SECURITY_QUESTION_COUNT;

  function setQuestionAt(index: number, value: string) {
    setSelected((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-5">
      <FormMessage state={state} />

      <Alert variant="info">
        <ShieldCheck aria-hidden="true" />
        <AlertDescription>
          Answers are normalised (trimmed, lower-cased, extra spaces collapsed)
          and hashed before storage. They are never stored or sent back as plain
          text, and never written to a log.
        </AlertDescription>
      </Alert>

      <Field
        label="Current password"
        htmlFor="sq-current-password"
        required
        error={state.fieldErrors?.currentPassword}
        hint="Confirms it is really you making this change."
      >
        <Input
          id="sq-current-password"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          aria-invalid={Boolean(state.fieldErrors?.currentPassword) || undefined}
        />
      </Field>

      {[0, 1, 2].map((index) => {
        const usedElsewhere = selected.filter((id, i) => id !== "" && i !== index);
        return (
          <div key={index} className="space-y-2 rounded-2xl border border-border bg-muted/40 p-3.5">
            <Field label={`Question ${index + 1}`} htmlFor={`questionId_${index}`} required>
              <NativeSelect
                id={`questionId_${index}`}
                name={`questionId_${index}`}
                required
                value={selected[index]}
                onChange={(event) => setQuestionAt(index, event.target.value)}
              >
                <option value="" disabled>
                  Choose a question…
                </option>
                {questions.map((question) => (
                  <option
                    key={question.id}
                    value={question.id}
                    disabled={usedElsewhere.includes(question.id)}
                  >
                    {question.question}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field
              label="Your answer"
              htmlFor={`answer_${index}`}
              required
              hint="Not case-sensitive."
            >
              <Input
                id={`answer_${index}`}
                name={`answer_${index}`}
                type="text"
                required
                maxLength={200}
                autoComplete="off"
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

      <SubmitButton pendingLabel="Updating…" disabled={!distinct}>
        Update security questions
      </SubmitButton>
    </form>
  );
}
