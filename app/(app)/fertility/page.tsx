import type { Metadata } from "next";
import { Egg, Info, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EstimateBadge, EstimateNote } from "@/components/shared/estimate-note";
import { DisclaimerNote } from "@/components/shared/disclaimer-note";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser, getCyclePrediction } from "@/lib/auth/current-user";
import { buildPredictedFertileWindows } from "@/lib/calculations/cycle";
import { PHASE_META, FERTILITY_TYPE_LABELS } from "@/lib/constants";
import { formatMedium, formatShort, relativeDayLabel, toISODate } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Fertility",
  description: "Estimated fertile window and ovulation, clearly labelled as estimates.",
};

export const dynamic = "force-dynamic";

export default async function FertilityPage() {
  const user = await requireUser();
  const { prediction } = await getCyclePrediction(user.id);

  const observedMarkers = await prisma.fertilityRecord.findMany({
    where: { userId: user.id, estimated: false },
    orderBy: { date: "desc" },
    take: 20,
    select: { id: true, date: true, type: true, note: true },
  });

  const upcoming = buildPredictedFertileWindows(prediction, 4);
  const phaseMeta = PHASE_META[prediction.cyclePhase];

  return (
    <>
      <PageHeader
        title="Fertility"
        description="Estimated from your logged cycle dates. Lunara cannot confirm ovulation, and none of this is a contraceptive method."
      />

      {/* The contraception warning sits at the very top, not buried at the
          bottom of the page. */}
      <DisclaimerNote kind="FERTILITY" />

      {prediction.ovulationDate === null ? (
        <EmptyState
          icon={<Egg />}
          title="No fertile window to estimate yet"
          description="Lunara needs at least one recorded period start before it can estimate a fertile window. Log your most recent period and this page will fill in."
          action={
            <Button asChild>
              <Link href="/calendar">Record a period</Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* ---- Current and next window ------------------------------ */}
          <div className="grid gap-5 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Estimated ovulation</CardTitle>
                <CardDescription>
                  {relativeDayLabel(prediction.ovulationDate)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="font-display text-2xl font-semibold">
                  {formatMedium(prediction.ovulationDate)}
                </p>
                <EstimateBadge uncertaintyDays={prediction.uncertaintyDays} />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Calculated by counting back 14 days from your estimated next
                  period. That assumes a typical luteal phase length, which varies
                  between people and between cycles.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estimated fertile window</CardTitle>
                <CardDescription>Six days: five before ovulation, plus one after.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="font-display text-2xl font-semibold">
                  {prediction.fertileWindowStart && prediction.fertileWindowEnd
                    ? `${formatShort(prediction.fertileWindowStart)} – ${formatShort(prediction.fertileWindowEnd)}`
                    : "—"}
                </p>
                <EstimateBadge uncertaintyDays={prediction.uncertaintyDays} />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  The window reflects how long sperm can survive and how long an
                  egg remains viable. It is a statistical range, not a biological
                  measurement.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current phase</CardTitle>
                <CardDescription>
                  Cycle day {prediction.currentCycleDay ?? "—"} of about{" "}
                  {prediction.averageCycleLength}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge
                  variant="outline"
                  className="gap-1.5"
                  style={{ borderColor: phaseMeta.colorVar, color: phaseMeta.colorVar }}
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: phaseMeta.colorVar }}
                    aria-hidden="true"
                  />
                  {phaseMeta.label}
                </Badge>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {phaseMeta.summary}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ---- Upcoming windows ------------------------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>Next four estimated windows</CardTitle>
              <CardDescription>
                Shown as ranges so the uncertainty is visible. A single date would
                imply precision that calendar arithmetic cannot provide.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {upcoming.map((window, index) => (
                  <li
                    key={toISODate(window.start)}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3"
                  >
                    <span className="flex size-8 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--phase-ovulation)_18%,transparent)] text-xs font-semibold text-[var(--phase-ovulation)]">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium">
                      {formatShort(window.start)} – {formatShort(window.end)}
                    </span>
                    <EstimateBadge
                      uncertaintyDays={prediction.uncertaintyDays}
                      className="ml-auto"
                    />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* ---- Your own observations -------------------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>Your own observations</CardTitle>
              <CardDescription>
                Anything you record here is kept separate from the estimates, so
                you can compare what the calendar predicted with what you actually
                noticed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {observedMarkers.length === 0 ? (
                <div className="flex items-start gap-2.5 rounded-2xl border border-dashed border-border bg-muted/40 p-4">
                  <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Nothing recorded yet. Ovulation test results, changes in
                    discharge, or a temperature shift can all be logged as
                    observations — they are yours, and Lunara will never overwrite
                    them with a prediction.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {observedMarkers.map((marker) => (
                    <li
                      key={marker.id}
                      className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3"
                    >
                      <span className="flex size-8 items-center justify-center rounded-xl bg-primary-soft text-primary">
                        <Sparkles className="size-4" aria-hidden="true" />
                      </span>
                      <span className="text-sm font-medium">
                        {FERTILITY_TYPE_LABELS[marker.type] ?? marker.type}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatMedium(marker.date)}
                      </span>
                      <Badge variant="success" className="ml-auto font-normal">
                        Your observation
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}

              <EstimateNote
                text="Observations are yours. Predictions are Lunara's. Keeping them apart is deliberate."
                tone="fertility"
              />
            </CardContent>
          </Card>

          <DisclaimerNote kind="ESTIMATE" />
        </>
      )}
    </>
  );
}
