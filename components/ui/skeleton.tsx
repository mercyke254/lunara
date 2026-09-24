import { cn } from "@/lib/utils";

/**
 * Loading placeholder.
 *
 * The shimmer animation is defined in globals.css and is automatically disabled
 * under `prefers-reduced-motion` by the global media query there.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("skeleton-shimmer rounded-xl", className)}
      {...props}
    />
  );
}

export { Skeleton };
