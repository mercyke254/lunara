"use client";

import { useTheme } from "next-themes";
import { Toaster as SonnerToaster, type ToasterProps } from "sonner";

/**
 * Toast host.
 *
 * Wired to `next-themes` so toasts follow the app's light/dark choice, and
 * positioned at the top on mobile so they are not hidden behind the bottom
 * navigation bar.
 */
function Toaster({ ...props }: ToasterProps) {
  const { resolvedTheme } = useTheme();

  return (
    <SonnerToaster
      theme={(resolvedTheme as ToasterProps["theme"]) ?? "system"}
      position="top-center"
      closeButton
      duration={4500}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:rounded-2xl group-[.toaster]:shadow-lift",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          error: "group-[.toaster]:border-destructive/40",
          success: "group-[.toaster]:border-[color-mix(in_oklab,var(--success)_40%,transparent)]",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
