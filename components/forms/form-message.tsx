"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ActionState } from "@/lib/actions/types";

/**
 * Renders a server action's result as an alert.
 *
 * `role="alert"` is applied by the Alert component for error variants, so the
 * message is announced without the user needing to hunt for it.
 */
export function FormMessage({
  state,
  className,
}: {
  state: ActionState;
  className?: string;
}) {
  if (!state.message || state.status === "idle") return null;

  return (
    <Alert
      variant={state.status === "error" ? "destructive" : "success"}
      className={className}
      aria-live="polite"
    >
      <AlertDescription className="text-foreground">{state.message}</AlertDescription>
    </Alert>
  );
}
