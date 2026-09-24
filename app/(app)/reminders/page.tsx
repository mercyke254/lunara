import type { Metadata } from "next";
import { Bell, Check, Info, Inbox } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ReminderManager } from "@/components/forms/reminder-manager";
import { DisclaimerNote } from "@/components/shared/disclaimer-note";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { requireUser } from "@/lib/auth/current-user";
import { getRecentNotifications, getReminders } from "@/lib/queries/tracking";
import { prisma } from "@/lib/db/prisma";
import {
  generateUpcomingNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadFormAction,
} from "@/lib/actions/reminder-actions";
import { formatMedium, formatShort } from "@/lib/dates";
import { NOTIFICATION_TYPE_LABELS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Reminders",
  description: "Period, fertile window, medication, appointment, and custom reminders.",
};

export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  const user = await requireUser();

  const [reminders, notifications, profile] = await Promise.all([
    getReminders(user.id),
    getRecentNotifications(user.id, 12),
    prisma.profile.findUnique({
      where: { userId: user.id },
      select: { notificationsEnabled: true },
    }),
  ]);

  const unread = notifications.filter((notification) => !notification.read).length;

  return (
    <>
      <PageHeader
        title="Reminders"
        description="Choose which nudges you want, and when. Every type has its own switch, so nothing is all-or-nothing."
        actions={
          unread > 0 ? (
            <Badge variant="destructive" className="font-normal">
              {unread} unread
            </Badge>
          ) : null
        }
      />

      {/* Honest scope statement: this build stores and surfaces reminders, but
          does not run a background dispatcher. */}
      <Alert variant="info">
        <Info aria-hidden="true" />
        <AlertTitle>How delivery works in this build</AlertTitle>
        <AlertDescription>
          Reminders and due notifications are stored and shown here, and Lunara
          creates the period and fertile-window notifications it can predict. Push
          or email delivery needs a scheduled worker, which this deployment does
          not include — so treat these as an in-app to-do list rather than a
          paging service.
        </AlertDescription>
      </Alert>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        {/* ---- Reminder configuration ----------------------------------- */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-4 text-primary" aria-hidden="true" />
                Your reminders
              </CardTitle>
              <CardDescription>
                Times are wall-clock times in your own local timezone. Lead time
                applies only to reminders that relate to a date.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReminderManager reminders={reminders} />
            </CardContent>
          </Card>
        </div>

        {/* ---- Notification inbox --------------------------------------- */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Inbox className="size-4 text-primary" aria-hidden="true" />
                Inbox
              </CardTitle>
              <CardDescription>
                Notifications Lunara has generated from your own data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={generateUpcomingNotificationsAction}>
                <Button type="submit" variant="soft" size="sm" block>
                  Check for upcoming reminders
                </Button>
              </form>

              {unread > 0 ? (
                <form action={markAllNotificationsReadAction}>
                  <Button type="submit" variant="ghost" size="sm" block>
                    <Check aria-hidden="true" />
                    Mark all as read
                  </Button>
                </form>
              ) : null}

              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing here yet. Turn on a reminder and Lunara will add
                  notifications as your estimates approach.
                </p>
              ) : (
                <ul id="notifications" className="space-y-3">
                  {notifications.map((notification) => (
                    <li
                      key={notification.id}
                      className={
                        notification.read
                          ? "rounded-2xl border border-border bg-card p-3.5"
                          : "rounded-2xl border border-primary/40 bg-primary-soft/30 p-3.5"
                      }
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{notification.title}</span>
                        <Badge variant="outline" className="font-normal">
                          {NOTIFICATION_TYPE_LABELS[notification.type]}
                        </Badge>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        {notification.message}
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-[11px] text-muted-foreground">
                          {notification.scheduledFor
                            ? `Due ${formatShort(notification.scheduledFor)}`
                            : formatMedium(notification.createdAt)}
                        </span>
                        {!notification.read ? (
                          <form action={markNotificationReadFormAction} className="ml-auto">
                            <input type="hidden" name="id" value={notification.id} />
                            <Button type="submit" variant="ghost" size="sm">
                              <Check aria-hidden="true" />
                              Read
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {profile && !profile.notificationsEnabled ? (
            <Alert variant="warning">
              <AlertDescription>
                Notifications are switched off globally in your privacy
                preferences, so no new notifications will be created even where a
                reminder is on. Change that in the{" "}
                <a href="/privacy" className="font-medium underline underline-offset-4">
                  privacy centre
                </a>
                .
              </AlertDescription>
            </Alert>
          ) : null}

          <DisclaimerNote kind="ESTIMATE" compact />
        </div>
      </div>
    </>
  );
}
