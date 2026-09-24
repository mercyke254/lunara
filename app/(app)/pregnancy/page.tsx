import type { Metadata } from "next";
import Link from "next/link";
import { Baby, Bell, CalendarHeart, Check, NotebookPen } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DisclaimerNote } from "@/components/shared/disclaimer-note";
import { EstimateBadge } from "@/components/shared/estimate-note";
import { PregnancyForm } from "@/components/forms/pregnancy-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/current-user";
import {
  buildPregnancyTimeline,
  computePregnancyProgress,
} from "@/lib/calculations/pregnancy";
import { formatMedium, formatShort, relativeDayLabel, today } from "@/lib/dates";
import { NOTIFICATION_TYPE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pregnancy",
  description: "Week-by-week timeline and estimated due date.",
};

export const dynamic = "force-dynamic";

export default async function PregnancyPage() {
  const user = await requireUser();
  const referenceDay = today();

  const [active, past, appointments, notifications] = await Promise.all([
    prisma.pregnancy.findFirst({
      where: { userId: user.id, active: true },
      orderBy: { startDate: "desc" },
      select: { id: true, startDate: true, dueDate: true },
    }),
    prisma.pregnancy.findMany({
      where: { userId: user.id, active: false },
      orderBy: { startDate: "desc" },
      take: 5,
      select: { id: true, startDate: true, dueDate: true, endedAt: true },
    }),
    prisma.reminder.findMany({
      where: { userId: user.id, type: "APPOINTMENT" },
      orderBy: { scheduledAt: "asc" },
      select: { id: true, label: true, enabled: true, scheduledAt: true, timeOfDay: true },
    }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, type: true, title: true, message: true, createdAt: true },
    }),
  ]);

  const progress = active
    ? computePregnancyProgress({
        lastPeriodStart: active.startDate,
        dueDate: active.dueDate,
        today: referenceDay,
      })
    : null;

  const timeline = progress ? buildPregnancyTimeline(progress) : [];

  return (
    <>
      <PageHeader
        title="Pregnancy"
        description={
          progress
            ? `${progress.trimesterLabel} · week ${progress.week}`
            : "Track a pregnancy week by week, with reminders for appointments."
        }
        actions={
          progress ? (
            <Badge variant="outline" className="gap-1.5">
              <Baby className="size-3.5" aria-hidden="true" />
              Active
            </Badge>
          ) : null
        }
      />

      <DisclaimerNote kind="PREGNANCY" />

      {!progress ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
          <Card>
            <CardHeader>
              <CardTitle>Turn on pregnancy mode</CardTitle>
              <CardDescription>
                Lunara will show a week count, a general timeline, and estimated
                dates. It stops cycle predictions while this is active, so you
                will not see contradictory period estimates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PregnancyForm />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What you get</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                {[
                  "Week-by-week progress and the estimated due date, labelled as an estimate",
                  "A general timeline of typical antenatal milestones",
                  "Appointment reminders you control individually",
                  "Symptom and mood logging on the same daily log",
                  "No cycle predictions while pregnancy mode is on",
                ].map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>

              {past.length > 0 ? (
                <div className="mt-5 border-t border-border pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Past records
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {past.map((record) => (
                      <li key={record.id} className="text-sm text-muted-foreground">
                        {formatShort(record.startDate)} – {formatShort(record.endedAt ?? record.dueDate)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {/* ---- Progress --------------------------------------------- */}
          <div className="grid gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
            <Card>
              <CardContent className="flex flex-col items-center pt-6 text-center">
                <span className="relative flex size-32 items-center justify-center">
                  <span
                    className="absolute inset-2 rounded-full bg-primary/15 blur-xl"
                    aria-hidden="true"
                  />
                  <span className="relative flex flex-col items-center">
                    <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Week
                    </span>
                    <span className="font-display text-5xl font-semibold leading-none">
                      {progress.week}
                    </span>
                    <span className="mt-1 text-xs text-muted-foreground">
                      +{progress.dayInWeek} {progress.dayInWeek === 1 ? "day" : "days"}
                    </span>
                  </span>
                </span>

                <p className="mt-4 text-sm font-medium">{progress.trimesterLabel}</p>

                <div className="mt-4 w-full">
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${progress.progressPercent}%` }}
                      role="progressbar"
                      aria-valuenow={progress.progressPercent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Pregnancy progress"
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {progress.progressPercent}% of the way to the estimated due
                    date
                  </p>
                </div>

                {progress.isPastDueDate ? (
                  <p className="mt-3 rounded-2xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
                    You are past the estimated due date. Only a small proportion
                    of babies arrive on it. Your midwife will advise on monitoring
                    and next steps.
                  </p>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {relativeDayLabel(progress.dueDate)} ·{" "}
                    {progress.daysRemaining} days to go
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle>Estimated due date</CardTitle>
                  <CardDescription>
                    {progress.isTooEarlyToDate
                      ? "Dating begins from the last period, so the estimate appears once that date has passed."
                      : "Derived from your dating information. A dating scan is more accurate than calendar arithmetic."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="font-display text-2xl font-semibold">
                    {formatMedium(progress.dueDate)}
                  </p>
                  <EstimateBadge />
                  <dl className="grid grid-cols-2 gap-3 pt-2">
                    <div className="rounded-2xl bg-muted/50 p-3">
                      <dt className="text-xs text-muted-foreground">Dating from</dt>
                      <dd className="mt-0.5 text-sm font-medium">
                        {formatShort(progress.lastPeriodStart)}
                      </dd>
                    </div>
                    <div className="rounded-2xl bg-muted/50 p-3">
                      <dt className="text-xs text-muted-foreground">
                        Estimated conception
                      </dt>
                      <dd className="mt-0.5 text-sm font-medium">
                        {formatShort(progress.estimatedConception)}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>This week</CardTitle>
                  <CardDescription>General information, not clinical advice.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="rounded-2xl bg-muted/50 p-4 text-sm leading-relaxed text-muted-foreground">
                    {progress.weeklyHighlight}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ---- Timeline ---------------------------------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
              <CardDescription>
                Conventional antenatal touchpoints. Schedules vary by country and
                provider, so treat these as a guide rather than a plan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-4 border-l border-border pl-6">
                {timeline.map((milestone) => (
                  <li key={milestone.label} className="relative">
                    <span
                      className={cn(
                        "absolute -left-[31px] flex size-5 items-center justify-center rounded-full border-2",
                        milestone.isPast
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card",
                      )}
                      aria-hidden="true"
                    >
                      {milestone.isPast ? <Check className="size-3" strokeWidth={3} /> : null}
                    </span>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          !milestone.isPast && "text-muted-foreground",
                        )}
                      >
                        {milestone.label}
                      </p>
                      <Badge variant="outline" className="font-normal">
                        week {milestone.week}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatShort(milestone.date)}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {/* ---- Appointments and reminders ---------------------------- */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Appointments</CardTitle>
                <CardDescription>
                  Appointment reminders are managed alongside your other
                  reminders, and each can be switched off on its own.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {appointments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No appointment reminders set up yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {appointments.map((reminder) => (
                      <li
                        key={reminder.id}
                        className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-muted/40 px-3.5 py-2.5"
                      >
                        <CalendarHeart
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <span className="text-sm font-medium">
                          {reminder.label ?? "Appointment"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {reminder.scheduledAt
                            ? formatShort(reminder.scheduledAt)
                            : `at ${reminder.timeOfDay}`}
                        </span>
                        <Badge
                          variant={reminder.enabled ? "success" : "outline"}
                          className="ml-auto font-normal"
                        >
                          {reminder.enabled ? "On" : "Off"}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}

                <Button asChild variant="outline" size="sm">
                  <Link href="/reminders">
                    <Bell aria-hidden="true" />
                    Manage reminders
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Logging during pregnancy</CardTitle>
                <CardDescription>
                  Your daily log keeps working. Symptoms you record now sit on the
                  same timeline as everything else.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button asChild size="sm">
                  <Link href="/log">
                    <NotebookPen aria-hidden="true" />
                    Open daily log
                  </Link>
                </Button>

                {notifications.length > 0 ? (
                  <div className="border-t border-border pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Recent notifications
                    </p>
                    <ul className="mt-2 space-y-2">
                      {notifications.map((notification) => (
                        <li key={notification.id} className="text-sm">
                          <span className="font-medium">{notification.title}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {NOTIFICATION_TYPE_LABELS[notification.type]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <DisclaimerNote kind="SEEK_CARE" />
        </>
      )}
    </>
  );
}
