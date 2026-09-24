import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-base shadow-sm transition-colors outline-none",
        "placeholder:text-muted-foreground/70",
        "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/25",
        "resize-y",
        "sm:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
