import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your calendar</span>

      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <Skeleton className="size-9 rounded-full" />
              <Skeleton className="h-6 w-36" />
              <Skeleton className="size-9 rounded-full" />
            </div>
            <Skeleton className="h-[320px] w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-6">
            {[0, 1, 2, 3, 4].map((index) => (
              <Skeleton key={index} className="h-5 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
