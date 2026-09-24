"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * Submit button that reflects the enclosing form's pending state.
 *
 * Uses `useFormStatus`, which reads the status of the nearest ancestor <form>,
 * so it must be rendered INSIDE the form (not next to it). This is what gives
 * every form a built-in loading state without each one wiring up its own.
 */
export function SubmitButton({
  children,
  pendingLabel,
  ...props
}: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" loading={pending} {...props}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
