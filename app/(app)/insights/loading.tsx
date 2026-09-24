import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function InsightsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your insights</span>

      <div className="space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-full max-w-lg" />
          <Skeleton className="h-[240px] w-full rounded-2xl" />
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {[0, 1].map((index) => (
          <Card key={index}>
            <CardContent className="space-y-3 pt-6">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-[280px] w-full rounded-2xl" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
