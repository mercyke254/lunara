import { cn } from "@/lib/utils";

/**
 * Text input.
 *
 * `text-base` on mobile is deliberate: iOS Safari zooms the viewport when a
 * focused input has a font size below 16px. It drops to `text-sm` from `sm:`
 * up, where that behaviour does not apply.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full min-w-0 rounded-xl border border-input bg-background px-3.5 py-2 text-base shadow-sm transition-colors outline-none",
        "placeholder:text-muted-foreground/70",
        "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/25",
        "file:mr-3 file:h-8 file:rounded-full file:border-0 file:bg-primary-soft file:px-3 file:text-xs file:font-medium file:text-primary",
        "sm:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
