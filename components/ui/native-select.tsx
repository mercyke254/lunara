import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Styled native <select>.
 *
 * Used where a form is submitted as a plain HTML form and the value must be
 * serialised into FormData with a `name`. Radix's Select is the better choice
 * for rich, searchable option lists, but a native control is more reliable here
 * and gives the OS picker wheel on mobile — which is what people expect for
 * "choose one of seven questions".
 */
export function NativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="native-select"
        className={cn(
          "h-11 w-full appearance-none rounded-xl border border-input bg-background px-3.5 pr-10 text-base shadow-sm transition-colors outline-none",
          "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-[invalid=true]:border-destructive",
          "sm:text-sm",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  );
}
