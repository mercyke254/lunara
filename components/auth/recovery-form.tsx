"use client";

import { useActionState } from "react";
import { verifyRecoveryAnswersAction } from "@/lib/actions/auth-actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { REQUIRED_SECURITY_QUESTION_COUNT } from "@/lib/constants";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface RecoveryQuestion {
  questionId: string;
  question: string;
}

/**
 * Recovery step 3: answer the security question.
 *
 * Notes:
 *  - the question ids travel as hidden fields, which is safe: an id identifies a
 *    question, never an answer, and the server only ever looks up answers scoped
 *    to the session's own user
 *  - the answers are NOT in the URL and NOT autocompleted, so they are not
 *    written to browser history or a password manager keyed to the wrong site
 *  - every failure shows the same generic message
 */
export function RecoveryForm({ questions }: { questions: RecoveryQuestion[] }) {
  const [state, formAction] = useActionState(verifyRecoveryAnswersAction, IDLE_STATE);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <Alert variant="info">
        <AlertDescription>
          Answer your security question and we will let you choose a new password.
          Verification is limited to a small number of attempts per session.
        </AlertDescription>
      </Alert>

      <FormMessage state={state} />

      {questions.map((q, index) => (
        <div key={q.questionId} className="space-y-2 rounded-2xl border border-border bg-muted/40 p-3.5">
          <input type="hidden" name={`questionId_${index}`} value={q.questionId} />

          <Field
            label={REQUIRED_SECURITY_QUESTION_COUNT === 1 ? "Your recovery question" : `Question ${index + 1}`}
            htmlFor={`answer_${index}`}
            required
            hint={<span className="font-medium text-foreground">{q.question}</span>}
          >
            <Input
              id={`answer_${index}`}
              name={`answer_${index}`}
              type="text"
              autoComplete="off"
              required
              maxLength={200}
              placeholder="Your answer"
              aria-invalid={state.status === "error" || undefined}
            />
          </Field>
        </div>
      ))}

      <SubmitButton block size="lg" pendingLabel="Verifying…">
        Verify answer
      </SubmitButton>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Answers are not case-sensitive. If you cannot remember it, you will
        need to create a new account — we cannot bypass it for you.
      </p>
    </form>
  );
}
