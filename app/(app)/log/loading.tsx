import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LogLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading today's log</span>

      <div className="space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,260px)]">
        <div className="space-y-5">
          {[0, 1, 2].map((index) => (
            <Card key={index}>
              <CardContent className="space-y-3 pt-6">
                <Skeleton className="h-5 w-32" />
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 8 }).map((_, chip) => (
                    <Skeleton key={chip} className="h-10 w-24 rounded-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="h-5 w-28" />
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-14 w-full rounded-2xl" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
