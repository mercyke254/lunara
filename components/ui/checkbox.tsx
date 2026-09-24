"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-5 shrink-0 rounded-md border border-input bg-background shadow-sm transition-colors outline-none",
        "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-destructive",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current"
      >
        <Check className="size-3.5 stroke-[3]" aria-hidden="true" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
