import type { Metadata } from "next";
import {
  Activity,
  CalendarRange,
  ChartLine,
  Droplet,
  Ruler,
  Smile,
  TrendingUp,
} from "lucide-react";
import {
  CycleLengthChart,
  FrequencyChart,
  MoodDistributionChart,
  PhaseBreakdownChart,
  WellnessTrendChart,
  type CycleLengthPoint,
  type FrequencyPoint,
  type PhaseBreakdownPoint,
  type WellnessPoint,
} from "@/components/charts/tracking-charts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { DisclaimerNote } from "@/components/shared/disclaimer-note";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { NotebookPen } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import {
  getMoodFrequency,
  getSymptomFrequency,
  getSymptomPhaseBreakdown,
  getWellnessLogsInRange,
} from "@/lib/queries/tracking";
import {
  buildCyclePrediction,
  computeCycleStatistics,
  type CycleHistoryEntry,
  type PeriodHistoryEntry,
} from "@/lib/calculations/cycle";
import {
  describeCycleLength,
  describeMood,
  describePeriodLength,
  describeRegularity,
  describeSymptomByPhase,
  describeSymptoms,
  describeTrend,
  describeWellness,
} from "@/lib/calculations/insights";
import { addDays, formatShort, today } from "@/lib/dates";
import { MOOD_OPTIONS, SYMPTOM_OPTIONS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Insights",
  description: "Cycle, symptom, mood and wellness trends from your own logs.",
};

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 90;

const SYMPTOM_LABELS = new Map(SYMPTOM_OPTIONS.map((o) => [o.value, o.label]));
const MOOD_LABELS = new Map(MOOD_OPTIONS.map((o) => [o.value, o.label]));

export default async function InsightsPage() {
  const user = await requireUser();
  const referenceDay = today();
  const windowStart = addDays(referenceDay, -WINDOW_DAYS);

  const [cycles, periods, symptomFrequency, moodFrequency, phaseBreakdown, wellness] =
    await Promise.all([
      prisma.cycle.findMany({
        where: { userId: user.id },
        orderBy: { startDate: "desc" },
        take: 24,
        select: { startDate: true, endDate: true, cycleLength: true, periodLength: true },
      }),
      prisma.period.findMany({
        where: { userId: user.id },
        orderBy: { startDate: "desc" },
        take: 24,
        select: { startDate: true, endDate: true },
      }),
      getSymptomFrequency(user.id, WINDOW_DAYS),
      getMoodFrequency(user.id, WINDOW_DAYS),
      getSymptomPhaseBreakdown(user.id, 180),
      getWellnessLogsInRange(user.id, windowStart, referenceDay),
    ]);

  const profileRow = await prisma.profile.findUnique({ where: { userId: user.id } });

  const cycleEntries: CycleHistoryEntry[] = cycles;
  const periodEntries: PeriodHistoryEntry[] = periods;

  const stats = computeCycleStatistics({
    cycles: cycleEntries,
    periods: periodEntries,
    profile: {
      averageCycleLength: profileRow?.averageCycleLength ?? 28,
      averagePeriodLength: profileRow?.averagePeriodLength ?? 5,
      lastPeriodStart: profileRow?.lastPeriodStart ?? null,
      cycleRegularity: profileRow?.cycleRegularity ?? "UNKNOWN",
    },
  });

  const prediction = buildCyclePrediction({
    cycles: cycleEntries,
    periods: periodEntries,
    profile: {
      averageCycleLength: profileRow?.averageCycleLength ?? 28,
      averagePeriodLength: profileRow?.averagePeriodLength ?? 5,
      lastPeriodStart: profileRow?.lastPeriodStart ?? null,
      cycleRegularity: profileRow?.cycleRegularity ?? "UNKNOWN",
    },
    today: referenceDay,
  });

  // ---- Chart series ------------------------------------------------------

  // Cycle lengths paired with the month they started, oldest first.
  const cycleLengthPoints: CycleLengthPoint[] = [...cycles]
    .reverse()
    .filter((cycle) => cycle.cycleLength !== null)
    .map((cycle) => ({
      label: formatShort(cycle.startDate),
      days: cycle.cycleLength as number,
    }));

  const symptomPoints: FrequencyPoint[] = symptomFrequency.slice(0, 8).map((row) => ({
    label: SYMPTOM_LABELS.get(row.value) ?? row.value,
    count: row.count,
  }));

  const moodPoints: FrequencyPoint[] = moodFrequency.map((row) => ({
    label: MOOD_LABELS.get(row.value) ?? row.value,
    count: row.count,
  }));

  const phasePoints: PhaseBreakdownPoint[] = phaseBreakdown.slice(0, 6).map((row) => ({
    label: SYMPTOM_LABELS.get(row.symptom) ?? row.symptom,
    menstrual: row.byPhase.MENSTRUAL ?? 0,
    follicular: row.byPhase.FOLLICULAR ?? 0,
    ovulation: row.byPhase.OVULATION ?? 0,
    luteal: row.byPhase.LUTEAL ?? 0,
  }));

  const wellnessPoints: WellnessPoint[] = wellness.map((entry) => ({
    label: formatShort(entry.date),
    sleep: entry.sleep,
    water: entry.water,
    energy: entry.energy,
    stress: entry.stress,
  }));

  const wellnessAverages = {
    averageSleep: average(wellness.map((w) => w.sleep)),
    averageWater: average(wellness.map((w) => w.water)),
    averageExerciseMinutes: average(wellness.map((w) => w.exerciseMinutes)),
    averageEnergy: average(wellness.map((w) => w.energy)),
    averageStress: average(wellness.map((w) => w.stress)),
    entries: wellness.length,
  };

  const hasAnyData =
    stats.dataPoints > 0 || symptomFrequency.length > 0 || moodFrequency.length > 0;

  if (!hasAnyData) {
    return (
      <>
        <PageHeader
          title="Insights"
          description="Patterns from your own logs — cycle lengths, symptoms, mood and wellness."
        />
        <EmptyState
          icon={<ChartLine />}
          title="Nothing to summarise yet"
          description="Insights are calculated entirely from what you record. Log a period start, then a few daily entries, and charts will start to fill in."
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild>
                <Link href="/log">
                  <NotebookPen aria-hidden="true" />
                  Log today
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/calendar">Open calendar</Link>
              </Button>
            </div>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Insights"
        description={`Calculated from the last ${WINDOW_DAYS} days of your own entries. Lunara describes what your data shows — it does not interpret it clinically.`}
        actions={
          statusBadge(stats.dataPoints, prediction.uncertaintyDays)
        }
      />

      {/* ---- Headline statistics ---------------------------------------- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Average cycle"
          icon={<ChartLine aria-hidden="true" />}
          value={stats.dataPoints > 0 ? stats.averageLength : "—"}
          unit={stats.dataPoints > 0 ? "days" : undefined}
          hint={`${stats.dataPoints} cycle${stats.dataPoints === 1 ? "" : "s"} measured`}
        />
        <StatCard
          label="Shortest"
          icon={<Ruler aria-hidden="true" />}
          tone="blue"
          value={stats.shortest ?? "—"}
          unit={stats.shortest ? "days" : undefined}
          hint="Minimum logged"
        />
        <StatCard
          label="Longest"
          icon={<Ruler aria-hidden="true" />}
          tone="blue"
          value={stats.longest ?? "—"}
          unit={stats.longest ? "days" : undefined}
          hint="Maximum logged"
        />
        <StatCard
          label="Period duration"
          icon={<Droplet aria-hidden="true" />}
          tone="rose"
          value={stats.averagePeriodLength > 0 ? stats.averagePeriodLength : "—"}
          unit={stats.averagePeriodLength > 0 ? "days" : undefined}
          hint="Average bleeding days"
        />
        <StatCard
          label="Variation"
          icon={<Activity aria-hidden="true" />}
          tone="warning"
          value={stats.dataPoints > 1 ? stats.variability : "—"}
          unit={stats.dataPoints > 1 ? "days" : undefined}
          hint="Spread between cycles"
        />
        <StatCard
          label="Trend"
          icon={<TrendingUp aria-hidden="true" />}
          tone="success"
          value={trendLabel(stats.trendDirection)}
          hint={
            stats.trendDirection === "INSUFFICIENT_DATA"
              ? "Needs 3+ cycles"
              : `${Math.abs(stats.trendSlope)} days per cycle`
          }
        />
      </div>

      {/* ---- Cycle length ------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Cycle length over time</CardTitle>
          <CardDescription>{describeCycleLength(stats)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <CycleLengthChart data={cycleLengthPoints} average={stats.averageLength} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Narrative title="Regularity" text={describeRegularity(stats)} />
            <Narrative title="Direction" text={describeTrend(stats)} />
          </div>
          <Narrative title="Bleeding duration" text={describePeriodLength(stats)} />
        </CardContent>
      </Card>

      {/* ---- Symptoms ----------------------------------------------------- */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Symptom frequency</CardTitle>
            <CardDescription>{describeSymptoms(symptomFrequency, WINDOW_DAYS)}</CardDescription>
          </CardHeader>
          <CardContent>
            <FrequencyChart
              data={symptomPoints}
              color="var(--phase-menstrual)"
              height={280}
              emptyMessage="No symptoms logged in this period."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mood distribution</CardTitle>
            <CardDescription>{describeMood(moodFrequency, WINDOW_DAYS)}</CardDescription>
          </CardHeader>
          <CardContent>
            <MoodDistributionChart data={moodPoints} height={280} />
          </CardContent>
        </Card>
      </div>

      {/* ---- Phase correlation ------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Symptoms by cycle phase</CardTitle>
          <CardDescription>{describeSymptomByPhase(phaseBreakdown)}</CardDescription>
        </CardHeader>
        <CardContent>
          <PhaseBreakdownChart data={phasePoints} height={300} />
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Phases are attributed using your recorded period starts and average
            cycle length, so a phase label on a past day is itself an estimate.
          </p>
        </CardContent>
      </Card>

      {/* ---- Wellness ----------------------------------------------------- */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sleep</CardTitle>
            <CardDescription>{describeWellness(wellnessAverages)}</CardDescription>
          </CardHeader>
          <CardContent>
            <WellnessTrendChart
              data={wellnessPoints}
              metric="sleep"
              unit="h"
              color="var(--primary)"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Water intake</CardTitle>
            <CardDescription>
              Millilitres per day from your wellness entries.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WellnessTrendChart
              data={wellnessPoints}
              metric="water"
              unit="ml"
              color="var(--accent-blue)"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Energy and stress</CardTitle>
            <CardDescription>
              Self-rated out of 5. Higher stress means a harder day, not a
              clinical measurement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WellnessTrendChart
              data={wellnessPoints}
              metric="energy"
              unit="/5"
              domain={[0, 5]}
              color="var(--success)"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stress</CardTitle>
            <CardDescription>
              Your own rating, charted so you can see busy stretches next to your
              cycle.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WellnessTrendChart
              data={wellnessPoints}
              metric="stress"
              unit="/5"
              domain={[0, 5]}
              color="var(--warning)"
            />
          </CardContent>
        </Card>
      </div>

      <DisclaimerNote kind="SYMPTOMS" />
      <DisclaimerNote kind="ESTIMATE" compact />
    </>
  );
}

// ---------------------------------------------------------------------------

function statusBadge(dataPoints: number, uncertaintyDays: number) {
  if (dataPoints === 0) {
    return (
      <Badge variant="outline">Based on your sign-up details</Badge>
    );
  }
  if (dataPoints < 3) {
    return (
      <Badge variant="outline" className="gap-1.5">
        <CalendarRange className="size-3.5" aria-hidden="true" />
        Early data — wide margins
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1.5">
      <CalendarRange className="size-3.5" aria-hidden="true" />
      ±{uncertaintyDays} day{uncertaintyDays === 1 ? "" : "s"} on predictions
    </Badge>
  );
}

function trendLabel(direction: string): string {
  switch (direction) {
    case "LENGTHENING":
      return "Longer";
    case "SHORTENING":
      return "Shorter";
    case "STABLE":
      return "Stable";
    default:
      return "—";
  }
}

function Narrative({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-muted/50 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Smile className="size-3.5" aria-hidden="true" />
        {title}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

/** Mean of the non-null values, or null when nothing was recorded. */
function average(values: Array<number | null>): number | null {
  const present = values.filter((value): value is number => value !== null);
  if (present.length === 0) return null;
  return present.reduce((sum, value) => sum + value, 0) / present.length;
}
