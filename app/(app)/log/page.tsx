import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, Sparkles } from "lucide-react";
import { DailyLogForm, type ExistingLog } from "@/components/forms/daily-log-form";
import { PageHeader } from "@/components/shared/page-header";
import { DisclaimerNote } from "@/components/shared/disclaimer-note";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/current-user";
import { getDailyLogsInRange, getWellnessLogsInRange } from "@/lib/queries/tracking";
import { addDays, formatMedium, fromISODate, toISODate, today } from "@/lib/dates";
import { MOTIVATION, MOOD_OPTIONS, SYMPTOM_OPTIONS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Daily log",
  description: "Record symptoms, mood, body and lifestyle for any day.",
};

export const dynamic = "force-dynamic";

const SYMPTOM_LABELS = new Map(SYMPTOM_OPTIONS.map((o) => [o.value, o.label]));
const MOOD_LABELS = new Map(MOOD_OPTIONS.map((o) => [o.value, o.label]));

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser();

  // Accept a date from the URL only if it parses and is not in the future;
  // otherwise fall back to today.
  const requested = params.date ? fromISODate(params.date) : null;
  const referenceDay =
    requested && requested.getTime() <= today().getTime() ? requested : today();

  const [dailyLog, wellness, intimate, recentLogs] = await Promise.all([
    prisma.dailyLog.findUnique({
      where: { userId_date: { userId: user.id, date: referenceDay } },
      select: {
        notes: true,
        symptoms: { select: { type: true, severity: true } },
        moods: { select: { type: true } },
      },
    }),
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
    // Private logs are read only for the signed-in user, and only to prefill
    // their own form.
    prisma.intimateLog.findUnique({
      where: { userId_date: { userId: user.id, date: referenceDay } },
      select: { activityType: true, protectionUsed: true, notes: true },
    }),
    getDailyLogsInRange(user.id, addDays(today(), -13), today()),
  ]);

  const existing: ExistingLog | null =
    dailyLog || wellness || intimate
      ? {
          symptoms: dailyLog?.symptoms ?? [],
          moods: dailyLog?.moods.map((m) => m.type) ?? [],
          notes: dailyLog?.notes ?? null,
          wellness: wellness ?? null,
          intimate: intimate ?? null,
        }
      : null;

  const isToday = toISODate(referenceDay) === toISODate(today());
  const motivation = MOTIVATION[referenceDay.getUTCDate() % MOTIVATION.length];

  return (
    <>
      <PageHeader
        title={isToday ? "Log today" : `Log ${formatMedium(referenceDay)}`}
        description="Everything here is optional. Logging takes about a minute, and the more consistently you log, the more useful your insights become."
        actions={
          existing ? (
            <Badge variant="success" className="gap-1.5">
              <CalendarCheck className="size-3.5" aria-hidden="true" />
              Saved
            </Badge>
          ) : null
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,260px)]">
        <div className="space-y-5">
          <DailyLogForm date={toISODate(referenceDay)} existing={existing} />

          {/* Guidance while logging: short, non-diagnostic, phase-agnostic. */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" aria-hidden="true" />
                A note for today
              </CardTitle>
              <CardDescription>{motivation}</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Recent days</CardTitle>
              <CardDescription>Jump to a day you already logged.</CardDescription>
            </CardHeader>
            <CardContent>
              {recentLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No entries in the last two weeks yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {recentLogs.map((log) => (
                    <li key={log.id}>
                      <Link
                        href={`/log?date=${toISODate(log.date)}`}
                        className="block rounded-2xl border border-border bg-muted/40 px-3.5 py-2.5 transition-colors hover:border-primary/40"
                      >
                        <span className="block text-sm font-medium">
                          {formatMedium(log.date)}
                        </span>
                        <span className="mt-1 flex flex-wrap gap-1">
                          {log.moods.slice(0, 2).map((mood) => (
                            <Badge key={mood} variant="secondary" className="font-normal">
                              {MOOD_LABELS.get(mood) ?? mood}
                            </Badge>
                          ))}
                          {log.symptoms.slice(0, 2).map((symptom) => (
                            <Badge key={symptom.type} variant="rose" className="font-normal">
                              {SYMPTOM_LABELS.get(symptom.type) ?? symptom.type}
                            </Badge>
                          ))}
                          {log.moods.length + log.symptoms.length > 4 ? (
                            <Badge variant="outline" className="font-normal">
                              +{log.moods.length + log.symptoms.length - 4}
                            </Badge>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <DisclaimerNote kind="SYMPTOMS" compact />
        </aside>
      </div>
    </>
  );
}
