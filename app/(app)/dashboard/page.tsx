import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChartLine,
  Droplet,
  Egg,
  NotebookPen,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { CycleRing } from "@/components/dashboard/cycle-ring";
import { QuickPeriodCard } from "@/components/dashboard/quick-period-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StatCard } from "@/components/shared/stat-card";
import { EstimateBadge, EstimateNote } from "@/components/shared/estimate-note";
import { DisclaimerNote } from "@/components/shared/disclaimer-note";
import { requireUser, getCyclePrediction } from "@/lib/auth/current-user";
import {
  getDailyLogForDate,
  getLatestWellnessLog,
  getRecentMeaningfulLogs,
} from "@/lib/queries/tracking";
import {
  describeCurrentPhase,
  describeUpcoming,
} from "@/lib/calculations/insights";
import { formatLong, formatMedium, formatShort, today } from "@/lib/dates";
import { MOOD_OPTIONS, PHASE_META, SYMPTOM_OPTIONS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Where you are in your cycle today.",
};

export const dynamic = "force-dynamic";

const SYMPTOM_LABELS = new Map(SYMPTOM_OPTIONS.map((o) => [o.value, o.label]));
const MOOD_LABELS = new Map(MOOD_OPTIONS.map((o) => [o.value, o.label]));

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser();
  const referenceDay = today();

  const [{ prediction, profile }, todayLog, recentLogs, latestWellness] =
    await Promise.all([
      getCyclePrediction(user.id),
      getDailyLogForDate(user.id, referenceDay),
      getRecentMeaningfulLogs(user.id, 5),
      getLatestWellnessLog(user.id),
    ]);

  const firstName = user.name.split(" ")[0] ?? user.name;
  const hasCycleData = prediction.currentCycleStart !== null;
  const phaseMeta = PHASE_META[prediction.cyclePhase];
  const hasOpenPeriod = prediction.isWithinRecordedPeriod;

  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {params.welcome === "1" ? (
        <Alert variant="success">
          <Sparkles aria-hidden="true" />
          <AlertDescription>
            You are all set. Lunara has an anchor date to work from and will
            sharpen its estimates with each cycle you log.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* ---------------------------------------------------------------- */}
      {/* Greeting                                                          */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Hello, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatLong(referenceDay)}
          </p>
        </div>
        <Button asChild variant={todayLog ? "outline" : "default"}>
          <Link href="/log">
            <NotebookPen aria-hidden="true" />
            {todayLog ? "Edit today's log" : "Log today"}
          </Link>
        </Button>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Cycle hero                                                        */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <Card className="flex flex-col items-center justify-center">
          <CardContent className="flex w-full flex-col items-center pt-6">
            <CycleRing
              cycleDay={prediction.currentCycleDay}
              cycleLength={prediction.averageCycleLength}
              phase={prediction.cyclePhase}
              size={236}
            />

            {hasCycleData ? (
              <>
                <p className="mt-4 text-center text-sm font-medium">
                  {describeUpcoming(prediction)}
                </p>
                <EstimateBadge
                  uncertaintyDays={prediction.uncertaintyDays}
                  className="mt-2"
                />
              </>
            ) : null}

            <EstimateNote
              text={prediction.estimateNotice}
              className="mt-3 justify-center text-center"
            />
          </CardContent>
        </Card>

        <div className="space-y-5">
          {/* Phase summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Phase</CardTitle>
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
              </div>
              <CardDescription>{describeCurrentPhase(prediction)}</CardDescription>
            </CardHeader>
            {phaseMeta.bodyNote ? (
              <CardContent>
                <p className="rounded-2xl bg-muted/60 p-3.5 text-sm leading-relaxed text-muted-foreground">
                  {phaseMeta.bodyNote}
                </p>
              </CardContent>
            ) : null}
          </Card>

          {/* Headline numbers */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Next period"
              icon={<Droplet aria-hidden="true" />}
              tone="rose"
              value={
                prediction.nextPeriodStart ? formatShort(prediction.nextPeriodStart) : "—"
              }
              hint={
                prediction.daysUntilNextPeriod !== null
                  ? prediction.daysUntilNextPeriod === 0
                    ? "Estimated today"
                    : `In ${prediction.daysUntilNextPeriod} ${prediction.daysUntilNextPeriod === 1 ? "day" : "days"}`
                  : "Log a period to estimate"
              }
            />
            <StatCard
              label="Avg cycle"
              icon={<ChartLine aria-hidden="true" />}
              tone="primary"
              value={prediction.averageCycleLength}
              unit="days"
              hint={
                prediction.basedOnCycles > 0
                  ? `From ${prediction.basedOnCycles} logged`
                  : "Your setting at sign-up"
              }
            />
            <StatCard
              label="Period length"
              icon={<CalendarDays aria-hidden="true" />}
              tone="blue"
              value={prediction.averagePeriodLength}
              unit="days"
              hint="Average of what you logged"
            />
            <StatCard
              label="Cycle day"
              icon={<TrendingUp aria-hidden="true" />}
              tone="neutral"
              value={prediction.currentCycleDay ?? "—"}
              hint={
                prediction.currentCycleDay
                  ? `of ${prediction.averageCycleLength} estimated`
                  : "No anchor date yet"
              }
            />
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Predictions with explicit estimate labelling                      */}
      {/* ---------------------------------------------------------------- */}
      {hasCycleData ? (
        <Card>
          <CardHeader>
            <CardTitle>What is coming up</CardTitle>
            <CardDescription>
              These dates are calculated from the periods you have logged. They
              are estimates, and Lunara will always label them as such.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <PredictionRow
                icon={<Droplet aria-hidden="true" />}
                label="Estimated period"
                value={
                  prediction.nextPeriodStart && prediction.nextPeriodEnd
                    ? `${formatShort(prediction.nextPeriodStart)} – ${formatShort(prediction.nextPeriodEnd)}`
                    : "—"
                }
                note={
                  prediction.daysUntilNextPeriod !== null
                    ? `Starts in ${prediction.daysUntilNextPeriod} ${prediction.daysUntilNextPeriod === 1 ? "day" : "days"}`
                    : undefined
                }
                uncertaintyDays={prediction.uncertaintyDays}
              />
              <PredictionRow
                icon={<Egg aria-hidden="true" />}
                label="Estimated fertile window"
                value={
                  prediction.fertileWindowStart && prediction.fertileWindowEnd
                    ? `${formatShort(prediction.fertileWindowStart)} – ${formatShort(prediction.fertileWindowEnd)}`
                    : "—"
                }
                note="Opens about 5 days before ovulation"
                uncertaintyDays={prediction.uncertaintyDays}
              />
              <PredictionRow
                icon={<Sparkles aria-hidden="true" />}
                label="Estimated ovulation"
                value={prediction.ovulationDate ? formatMedium(prediction.ovulationDate) : "—"}
                note={
                  prediction.daysUntilOvulation !== null
                    ? prediction.daysUntilOvulation === 0
                      ? "Estimated today"
                      : `In ${prediction.daysUntilOvulation} ${prediction.daysUntilOvulation === 1 ? "day" : "days"}`
                    : undefined
                }
                uncertaintyDays={prediction.uncertaintyDays}
              />
            </div>

            <EstimateNote text={prediction.estimateNotice} />

            {prediction.isAwaitingPeriodLog ? (
              <Alert variant="warning">
                <AlertDescription>
                  Today is past your estimated next period start. Predictions
                  shift once you log the new date — until then, the dates above
                  are carried forward from your last entry.
                </AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* ---------------------------------------------------------------- */}
      {/* Next action: record a first period, or quick-log                  */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Record a period</CardTitle>
            <CardDescription>
              {hasCycleData
                ? "Starting a new period re-anchors every estimate."
                : "This is the one piece of data Lunara needs to start."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <QuickPeriodCard
              hasOpenPeriod={hasOpenPeriod}
              lastPeriodStart={profile.lastPeriodStart}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent symptoms and mood</CardTitle>
            <CardDescription>
              {recentLogs.length > 0
                ? "The most recent days where you recorded how you felt."
                : "Nothing recorded yet. Your last few entries will show here."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-5 text-center">
                <p className="text-sm text-muted-foreground">
                  Logging takes about a minute and makes every insight better.
                </p>
                <Button asChild size="sm" className="mt-3">
                  <Link href="/log">
                    <NotebookPen aria-hidden="true" />
                    Log how you feel
                  </Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {recentLogs.map((log) => (
                  <li key={log.id} className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      {formatMedium(log.date)}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {log.moods.map((mood) => (
                        <Badge key={mood} variant="secondary" className="font-normal">
                          {MOOD_LABELS.get(mood) ?? mood}
                        </Badge>
                      ))}
                      {log.symptoms.map((symptom) => (
                        <Badge key={symptom.type} variant="rose" className="font-normal">
                          {SYMPTOM_LABELS.get(symptom.type) ?? symptom.type}
                          {symptom.severity ? ` · ${symptom.severity}/5` : ""}
                        </Badge>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Wellness snapshot + navigation                                    */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Wellness</CardTitle>
            <CardDescription>
              {latestWellness
                ? `Most recent entry: ${formatMedium(latestWellness.date)}`
                : "Sleep, water, movement, energy and stress in one place."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {latestWellness ? (
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric label="Sleep" value={latestWellness.sleep ? `${latestWellness.sleep} h` : "—"} />
                <Metric label="Water" value={latestWellness.water ? `${Math.round(latestWellness.water)} ml` : "—"} />
                <Metric label="Movement" value={latestWellness.exerciseMinutes ? `${latestWellness.exerciseMinutes} min` : "—"} />
                <Metric label="Energy" value={latestWellness.energy ? `${latestWellness.energy}/5` : "—"} />
              </dl>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-5 text-center">
                <p className="text-sm text-muted-foreground">
                  Add sleep, water or movement and Lunara will chart them against
                  your cycle.
                </p>
                <Button asChild size="sm" variant="soft" className="mt-3">
                  <Link href="/wellness">
                    <Droplet aria-hidden="true" />
                    Open wellness
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Go deeper</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <NavRow href="/calendar" icon={<CalendarDays aria-hidden="true" />} label="Calendar" hint="Periods and predictions" />
            <NavRow href="/insights" icon={<ChartLine aria-hidden="true" />} label="Insights" hint="Trends and averages" />
            <NavRow href="/fertility" icon={<Egg aria-hidden="true" />} label="Fertility" hint="Estimated window" />
          </CardContent>
        </Card>
      </div>

      <DisclaimerNote kind="SYMPTOMS" />
    </>
  );
}

// ---------------------------------------------------------------------------

function PredictionRow({
  icon,
  label,
  value,
  note,
  uncertaintyDays,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note?: string;
  uncertaintyDays: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-4">
      <div className="flex items-center gap-2 text-muted-foreground [&_svg]:size-4">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 font-display text-lg font-semibold">{value}</p>
      {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
      <EstimateBadge uncertaintyDays={uncertaintyDays} className="mt-2" />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/50 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-display text-base font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function NavRow({
  href,
  icon,
  label,
  hint,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-muted"
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary [&_svg]:size-4">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      <ArrowRight className="ml-auto size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}
