import type { Metadata } from "next";
import Link from "next/link";
import { Droplet, Footprints, Moon, NotebookPen, Sparkles } from "lucide-react";
import { WellnessForm } from "@/components/forms/wellness-form";
import {
  WellnessTrendChart,
  type WellnessPoint,
} from "@/components/charts/tracking-charts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DisclaimerNote } from "@/components/shared/disclaimer-note";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/current-user";
import { getWellnessLogsInRange } from "@/lib/queries/tracking";
import { describeWellness } from "@/lib/calculations/insights";
import { addDays, formatShort, fromISODate, toISODate, today } from "@/lib/dates";
import { DAILY_GOALS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Wellness",
  description: "Sleep, hydration, movement, energy and stress over time.",
};

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 30;

export default async function WellnessPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser();

  const requested = params.date ? fromISODate(params.date) : null;
  const referenceDay =
    requested && requested.getTime() <= today().getTime() ? requested : today();

  const [logs, existing, prediction] = await Promise.all([
    getWellnessLogsInRange(user.id, addDays(today(), -WINDOW_DAYS), today()),
    prisma.wellnessLog.findUnique({
      where: { userId_date: { userId: user.id, date: referenceDay } },
      select: {
        weight: true,
        temperature: true,
        sleep: true,
        sleepQuality: true,
        energy: true,
        stress: true,
        water: true,
        exerciseMinutes: true,
        exercise: true,
      },
    }),
    prisma.profile.findUnique({
      where: { userId: user.id },
      select: { averageCycleLength: true },
    }),
  ]);

  const points: WellnessPoint[] = logs.map((entry) => ({
    label: formatShort(entry.date),
    sleep: entry.sleep,
    water: entry.water,
    energy: entry.energy,
    stress: entry.stress,
  }));

  const averages = {
    averageSleep: mean(logs.map((l) => l.sleep)),
    averageWater: mean(logs.map((l) => l.water)),
    averageExerciseMinutes: mean(logs.map((l) => l.exerciseMinutes)),
    averageEnergy: mean(logs.map((l) => l.energy)),
    averageStress: mean(logs.map((l) => l.stress)),
    entries: logs.length,
  };

  return (
    <>
      <PageHeader
        title="Wellness"
        description="Sleep, hydration, movement, energy and stress — recorded on the same timeline as your cycle so patterns are easier to spot."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/log">
              <NotebookPen aria-hidden="true" />
              Full daily log
            </Link>
          </Button>
        }
      />

      {/* ---- Averages over the window ----------------------------------- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Sleep"
          icon={<Moon aria-hidden="true" />}
          tone="primary"
          value={averages.averageSleep !== null ? averages.averageSleep.toFixed(1) : "—"}
          unit={averages.averageSleep !== null ? "h" : undefined}
          hint={`Average over ${logs.length} ${logs.length === 1 ? "day" : "days"}`}
        />
        <StatCard
          label="Water"
          icon={<Droplet aria-hidden="true" />}
          tone="blue"
          value={averages.averageWater !== null ? Math.round(averages.averageWater) : "—"}
          unit={averages.averageWater !== null ? "ml" : undefined}
          hint={`Guide: ${DAILY_GOALS.WATER_ML} ml`}
        />
        <StatCard
          label="Movement"
          icon={<Footprints aria-hidden="true" />}
          tone="success"
          value={
            averages.averageExerciseMinutes !== null
              ? Math.round(averages.averageExerciseMinutes)
              : "—"
          }
          unit={averages.averageExerciseMinutes !== null ? "min" : undefined}
          hint="Average per recorded day"
        />
        <StatCard
          label="Energy"
          icon={<Sparkles aria-hidden="true" />}
          tone="rose"
          value={averages.averageEnergy !== null ? averages.averageEnergy.toFixed(1) : "—"}
          unit={averages.averageEnergy !== null ? "/5" : undefined}
          hint="Your own rating"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What these numbers show</CardTitle>
          <CardDescription>{describeWellness(averages)}</CardDescription>
        </CardHeader>
      </Card>

      {/* ---- Entry form ------------------------------------------------- */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
        <Card>
          <CardHeader>
            <CardTitle>Log wellness</CardTitle>
            <CardDescription>
              Saving here updates the same record the daily log writes to, so the
              two can never disagree.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WellnessForm date={toISODate(referenceDay)} existing={existing} />
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Trends</CardTitle>
              <CardDescription>
                Last {WINDOW_DAYS} days. Gaps are days with no entry, not zero
                values.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Sleep
                </p>
                <WellnessTrendChart
                  data={points}
                  metric="sleep"
                  unit="h"
                  color="var(--primary)"
                  height={140}
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Water
                </p>
                <WellnessTrendChart
                  data={points}
                  metric="water"
                  unit="ml"
                  color="var(--accent-blue)"
                  height={140}
                />
              </div>
            </CardContent>
          </Card>

          {prediction?.averageCycleLength ? (
            <Card>
              <CardHeader>
                <CardTitle>Cycle context</CardTitle>
                <CardDescription>
                  Your average cycle is {prediction.averageCycleLength} days.
                  Comparing these trends against your{" "}
                  <Link href="/insights" className="text-primary underline-offset-4 hover:underline">
                    cycle insights
                  </Link>{" "}
                  often shows which phase a dip belongs to.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          <DisclaimerNote kind="SYMPTOMS" compact />
        </div>
      </div>
    </>
  );
}

/** Mean of non-null values, or null when nothing was recorded. */
function mean(values: Array<number | null>): number | null {
  const present = values.filter((value): value is number => value !== null);
  if (present.length === 0) return null;
  return present.reduce((sum, value) => sum + value, 0) / present.length;
}
