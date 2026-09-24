import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { PeriodCalendar } from "@/components/calendar/period-calendar";
import { PageHeader } from "@/components/shared/page-header";
import { DisclaimerNote } from "@/components/shared/disclaimer-note";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireUser, getCyclePrediction } from "@/lib/auth/current-user";
import { getCycleHistory, getPeriodHistory } from "@/lib/queries/tracking";
import { toISODate, today } from "@/lib/dates";
import { REGULARITY_OPTIONS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Calendar",
  description: "Record periods and see predicted dates on one calendar.",
};

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const user = await requireUser();

  const [{ prediction, profile }, periods, cycles] = await Promise.all([
    getCyclePrediction(user.id),
    getPeriodHistory(user.id, 36),
    getCycleHistory(user.id, 36),
  ]);

  const regularityLabel =
    REGULARITY_OPTIONS.find((o) => o.value === prediction.regularity)?.label ??
    "Not established";

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Tap any day to record a period start, correct an entry, or close an ongoing period. Recorded days, predicted days, and your estimated fertile window all appear together."
        actions={
          <Badge variant="outline" className="gap-1.5">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {formatCount(periods.length)} recorded
          </Badge>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
        <Card>
          <CardContent className="pt-6">
            <PeriodCalendar
              periods={periods}
              cycles={cycles}
              todayIso={toISODate(today())}
              averageCycleLength={prediction.averageCycleLength}
              averagePeriodLength={prediction.averagePeriodLength}
              cycleRegularity={profile.cycleRegularity}
              lastPeriodStart={profile.lastPeriodStart}
            />
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Current estimate</CardTitle>
              <CardDescription>
                Recalculated from every period you have recorded.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <SummaryRow label="Cycle day" value={prediction.currentCycleDay ? `${prediction.currentCycleDay}` : "—"} />
              <SummaryRow label="Average cycle" value={`${prediction.averageCycleLength} days`} />
              <SummaryRow label="Period length" value={`${prediction.averagePeriodLength} days`} />
              <SummaryRow label="Regularity" value={regularityLabel} />
              <SummaryRow
                label="Cycles measured"
                value={prediction.basedOnCycles === 0 ? "None yet" : `${prediction.basedOnCycles}`}
              />
              {prediction.shortestCycleLength !== null && prediction.longestCycleLength !== null ? (
                <SummaryRow
                  label="Range"
                  value={`${prediction.shortestCycleLength}–${prediction.longestCycleLength} days`}
                />
              ) : null}
            </CardContent>
          </Card>

          {prediction.isIrregular ? (
            <Card>
              <CardHeader>
                <CardTitle>Wider margins</CardTitle>
                <CardDescription>
                  Your logged cycles vary by around{" "}
                  {prediction.variabilityDays} days, so Lunara adds about ±
                  {prediction.uncertaintyDays} days to every date. A single
                  confident-looking day would be misleading, so the calendar
                  shows the whole window instead.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          <DisclaimerNote kind="ESTIMATE" compact />
        </div>
      </div>

      <DisclaimerNote kind="SYMPTOMS" />
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}

function formatCount(count: number): string {
  return count === 1 ? "1 period" : `${count} periods`;
}
