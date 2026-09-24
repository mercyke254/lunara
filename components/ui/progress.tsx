"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

function Progress({
  className,
  value,
  indicatorClassName,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  indicatorClassName?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value ?? 0));

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={clamped}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "h-full w-full flex-1 rounded-full bg-primary transition-transform duration-500 ease-out",
          indicatorClassName,
        )}
        style={{ transform: `translateX(-${100 - clamped}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
