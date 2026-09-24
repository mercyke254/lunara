"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Trash2 } from "lucide-react";
import { deleteArticleAction } from "@/lib/actions/admin-actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Delete an article, then leave the editor.
 *
 * Uses `useActionState` for the message and a `useEffect` on the success state to
 * navigate away — the article no longer exists, so remaining on its edit page
 * would show a form bound to a deleted row.
 */
export function DeleteArticleForm({ id, title }: { id: string; title: string }) {
  const [state, formAction] = useActionState(deleteArticleAction, IDLE_STATE);
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") router.push("/admin/articles");
  }, [state.status, router]);

  return (
    <form action={formAction} className="space-y-4">
      <FormMessage state={state} />

      <Alert variant="destructive">
        <AlertTitle>Delete this article</AlertTitle>
        <AlertDescription>
          Permanently removes &ldquo;{title}&rdquo;. Unpublishing instead keeps the
          content available for later.
        </AlertDescription>
      </Alert>

      <input type="hidden" name="id" value={id} />

      <SubmitButton
        variant="destructive"
        pendingLabel="Deleting…"
        onClick={(event) => {
          if (!confirm(`Permanently delete "${title}"? This cannot be undone.`)) {
            event.preventDefault();
          }
        }}
      >
        <Trash2 aria-hidden="true" />
        Delete article
      </SubmitButton>
    </form>
  );
}
