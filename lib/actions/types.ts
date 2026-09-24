/**
 * Shared result shape for every server action.
 *
 * Actions never throw for expected failures (bad credentials, validation
 * errors); they return a serialisable state so forms can render messages via
 * `useActionState`. Unexpected errors are caught and converted to a generic
 * message, so an internal error can never leak a stack trace or SQL fragment to
 * the client.
 */

export type ActionStatus = "idle" | "success" | "error";

export interface ActionState {
  status: ActionStatus;
  /** A single user-facing message. */
  message?: string;
  /** Per-field messages, keyed by field name, for inline display. */
  fieldErrors?: Record<string, string>;
  /**
   * Non-secret data an action needs to hand back to the form
   * (e.g. a computed due date). Never used for tokens or credentials.
   */
  data?: Record<string, unknown>;
}

export const IDLE_STATE: ActionState = { status: "idle" };

export function successState(
  message?: string,
  data?: Record<string, unknown>,
): ActionState {
  return { status: "success", message, data };
}

export function errorState(
  message: string,
  fieldErrors?: Record<string, string>,
): ActionState {
  return { status: "error", message, fieldErrors };
}

/** Message used whenever an internal failure occurs. Reveals nothing. */
export const GENERIC_ERROR_MESSAGE =
  "Something went wrong on our side. Please try again in a moment.";

/**
 * Wrap an action body so that an unexpected throw becomes a generic error state
 * and is logged server-side without sensitive detail.
 *
 * IMPORTANT: Next.js signals redirects and `notFound()` by throwing special
 * errors. Those must propagate, so they are re-thrown here rather than
 * swallowed into a generic failure.
 */
export async function withErrorHandling(
  label: string,
  run: () => Promise<ActionState>,
): Promise<ActionState> {
  try {
    return await run();
  } catch (error) {
    if (isFrameworkControlFlowError(error)) throw error;

    console.error(
      `[lunara:action] ${label} failed:`,
      error instanceof Error ? error.message : "unknown error",
    );
    return errorState(GENERIC_ERROR_MESSAGE);
  }
}

function isFrameworkControlFlowError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && /^(NEXT_REDIRECT|NEXT_HTTP_ERROR_FALLBACK|NEXT_NOT_FOUND)/.test(digest);
}
