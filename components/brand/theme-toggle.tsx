"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "system", label: "System", Icon: Monitor },
  { value: "dark", label: "Dark", Icon: Moon },
] as const;

/**
 * Segmented light / system / dark control.
 *
 * `mounted` guards the render: the theme is resolved on the client, so
 * rendering the active state during SSR would produce a hydration mismatch.
 * Until mounted we render the control with no option selected, which is stable
 * on both sides.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-border bg-card p-0.5",
        className,
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${label} theme`}
            title={`${label} theme`}
            onClick={() => setTheme(value)}
            className={cn(
              "flex size-8 items-center justify-center rounded-full transition-colors",
              active
                ? "bg-primary-soft text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

/**
 * Compact single-button variant that cycles light -> dark -> system.
 * Used in the mobile header where space is tight.
 */
export function ThemeToggleCompact({ className }: { className?: string }) {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label="Change colour theme"
      title="Change colour theme"
      className={cn(
        "flex size-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      {isDark ? (
        <Moon className="size-4" aria-hidden="true" />
      ) : (
        <Sun className="size-4" aria-hidden="true" />
      )}
    </button>
  );
}
