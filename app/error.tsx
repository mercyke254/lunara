"use client";

import { useEffect } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { LunaraLogo } from "@/components/brand/lunara-logo";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Route-level error boundary.
 *
 * Shows a generic message and a retry rather than the underlying error: the
 * message on screen is user-facing, and raw error text can disclose internals.
 * The digest is surfaced because it is the only thing that lets a user quote a
 * failure to support without leaking anything sensitive.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server-side details are already logged; this keeps a client breadcrumb.
    console.error("[lunara:ui] unhandled error:", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="bg-lunara-wash flex min-h-dvh flex-col items-center justify-center px-4 py-16">
      <LunaraLogo size={40} showWordmark={false} />

      <h1 className="mt-6 font-display text-2xl font-semibold sm:text-3xl">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-center text-sm leading-relaxed text-muted-foreground">
        This screen failed to load. Your saved data has not been changed.
        Trying again usually fixes it.
      </p>

      <Alert variant="warning" className="mt-8 max-w-md">
        <AlertTitle>If it keeps happening</AlertTitle>
        <AlertDescription>
          Note down the reference below and try again later. If you were in the
          middle of logging, your entry may not have been saved.
          {error.digest ? (
            <>
              {" "}
              Reference: <code className="font-mono text-xs">{error.digest}</code>
            </>
          ) : null}
        </AlertDescription>
      </Alert>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button onClick={reset}>
          <RefreshCw aria-hidden="true" />
          Try again
        </Button>
        <Button variant="outline" asChild>
          <a href="/dashboard">
            <TriangleAlert aria-hidden="true" />
            Back to dashboard
          </a>
        </Button>
      </div>
    </div>
  );
}
