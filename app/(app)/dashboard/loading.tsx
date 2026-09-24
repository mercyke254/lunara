import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Dashboard loading state.
 *
 * Mirrors the real layout (hero dial, stat strip, two cards) rather than showing
 * a single spinner, so the page does not visibly reflow when data arrives.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your dashboard</span>

      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-11 w-32 rounded-full" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <Skeleton className="size-56 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardContent className="space-y-3 pt-6">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-28 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </CardContent>
      </Card>
    </div>
  );
}
