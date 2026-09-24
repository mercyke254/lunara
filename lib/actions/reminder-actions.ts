"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { reminderSchema } from "@/lib/validation/schemas";
import { addDays, formatShort, today } from "@/lib/dates";
import {
  errorState,
  successState,
  withErrorHandling,
  type ActionState,
} from "@/lib/actions/types";
import { REMINDER_TYPE_OPTIONS } from "@/lib/constants";

/**
 * Reminder and notification mutations.
 *
 * Reminders are per-type rows: `(userId, type)` is the natural key, so saving a
 * type updates the existing row rather than accumulating duplicates. Enablement
 * is stored per type, which is what "allow notifications to be enabled/disabled
 * individually" requires.
 *
 * Note on delivery: this build PERSISTS reminders and materialises due
 * notifications into the `Notification` table. Actually dispatching push/email
 * needs an external scheduler, which is out of scope here and documented in the
 * README. Nothing in this module claims a notification was delivered.
 */

function revalidateReminders() {
  revalidatePath("/reminders");
  revalidatePath("/dashboard");
}

export async function saveReminderAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("save-reminder", async () => {
    const user = await getSessionUser();
    if (!user) return errorState("Your session has expired. Please sign in again.");

    const parsed = reminderSchema.safeParse({
      type: String(formData.get("type") ?? ""),
      enabled: formData.get("enabled") === "on",
      label: String(formData.get("label") ?? "") || undefined,
      timeOfDay: String(formData.get("timeOfDay") ?? "09:00"),
      leadTimeDays: String(formData.get("leadTimeDays") ?? "0"),
    });

    if (!parsed.success) {
      return errorState(
        "Please check the highlighted fields.",
        Object.fromEntries(
          parsed.error.issues.map((issue) => [issue.path.join(".") || "form", issue.message]),
        ),
      );
    }

    const { type, enabled, label, timeOfDay, leadTimeDays } = parsed.data;

    // Only types that legitimately support lead time accept a non-zero value,
    // so a stray form field cannot produce a nonsensical schedule.
    const supportsLeadTime =
      REMINDER_TYPE_OPTIONS.find((option) => option.value === type)?.supportsLeadTime ?? false;
    const effectiveLeadTime = supportsLeadTime ? leadTimeDays : 0;

    await prisma.reminder.upsert({
      where: { userId_type: { userId: user.id, type } },
      create: {
        userId: user.id,
        type,
        enabled,
        label: label ?? null,
        timeOfDay,
        leadTimeDays: effectiveLeadTime,
      },
      update: {
        enabled,
        label: label ?? null,
        timeOfDay,
        leadTimeDays: effectiveLeadTime,
      },
    });

    revalidateReminders();
    return successState(enabled ? "Reminder saved and switched on." : "Reminder saved and switched off.");
  });
}

/** Flip a single reminder on or off without touching its schedule. */
export async function toggleReminderAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("toggle-reminder", async () => {
    const user = await getSessionUser();
    if (!user) return errorState("Your session has expired. Please sign in again.");

    const type = String(formData.get("type") ?? "");
    const enabled = formData.get("enabled") === "on";

    if (!REMINDER_TYPE_OPTIONS.some((option) => option.value === type)) {
      return errorState("That reminder type is not recognised.");
    }

    await prisma.reminder.upsert({
      where: { userId_type: { userId: user.id, type: type as never } },
      create: { userId: user.id, type: type as never, enabled },
      update: { enabled },
    });

    revalidateReminders();
    return successState(enabled ? "Switched on." : "Switched off.");
  });
}

/** Remove a reminder row entirely (back to "not configured"). */
export async function deleteReminderAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("delete-reminder", async () => {
    const user = await getSessionUser();
    if (!user) return errorState("Your session has expired. Please sign in again.");

    const type = String(formData.get("type") ?? "");
    const result = await prisma.reminder.deleteMany({
      where: { userId: user.id, type: type as never },
    });

    if (result.count === 0) return errorState("That reminder could not be found.");

    revalidateReminders();
    return successState("Reminder removed.");
  });
}

/** Mark one notification as read. Scoped by userId. */
export async function markNotificationReadAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("mark-notification-read", async () => {
    const user = await getSessionUser();
    if (!user) return errorState("Your session has expired. Please sign in again.");

    const id = String(formData.get("id") ?? "").trim();
    if (!id) return errorState("That notification could not be found.");

    const result = await prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { read: true },
    });

    if (result.count === 0) return errorState("That notification could not be found.");

    revalidateReminders();
    return successState("Marked as read.");
  });
}

/**
 * Form-handler wrapper around `markNotificationReadAction`.
 *
 * A `<form action={...}>` handler receives only FormData, so a function with the
 * `useActionState` signature `(prevState, formData)` cannot be used directly.
 * Rather than duplicate the logic, this adapter supplies the initial state. The
 * result is discarded because the markup is rendered by a Server Component and
 * the message would have nowhere to go.
 */
export async function markNotificationReadFormAction(
  formData: FormData,
): Promise<void> {
  await markNotificationReadAction({ status: "idle" }, formData);
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;

  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });

  revalidateReminders();
}

/**
 * Materialise upcoming notifications from the current prediction.
 *
 * This is a pull-based stand-in for a scheduled job: opening the reminders
 * screen generates any period or fertile-window notifications that fall inside
 * the next few days, skipping ones already created (keyed by type + scheduled
 * day). Nothing is marked as delivered — that would require a real dispatcher.
 */
export async function generateUpcomingNotificationsAction(): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { notificationsEnabled: true },
  });
  if (!profile?.notificationsEnabled) return;

  const reminders = await prisma.reminder.findMany({
    where: { userId: user.id, enabled: true },
    select: { type: true, leadTimeDays: true },
  });
  if (reminders.length === 0) return;

  const { getCyclePrediction } = await import("@/lib/auth/current-user");
  const { prediction } = await getCyclePrediction(user.id);

  const now = today();
  const candidates: Array<{
    type: "PERIOD" | "FERTILE_WINDOW";
    title: string;
    message: string;
    scheduledFor: Date;
  }> = [];

  const periodReminder = reminders.find((r) => r.type === "PERIOD");
  if (periodReminder && prediction.nextPeriodStart) {
    const notifyOn = addDays(prediction.nextPeriodStart, -periodReminder.leadTimeDays);
    if (notifyOn.getTime() >= now.getTime()) {
      candidates.push({
        type: "PERIOD",
        title: "Estimated period approaching",
        message: `Your period is estimated to start around ${formatShort(prediction.nextPeriodStart)}. This is an estimate, not a certainty.`,
        scheduledFor: notifyOn,
      });
    }
  }

  const fertileReminder = reminders.find((r) => r.type === "FERTILE_WINDOW");
  if (fertileReminder && prediction.fertileWindowStart) {
    const notifyOn = addDays(prediction.fertileWindowStart, -fertileReminder.leadTimeDays);
    if (notifyOn.getTime() >= now.getTime()) {
      candidates.push({
        type: "FERTILE_WINDOW",
        title: "Estimated fertile window opening",
        message: `Your estimated fertile window begins around ${formatShort(prediction.fertileWindowStart)}. This is an estimate and is not a contraceptive method.`,
        scheduledFor: notifyOn,
      });
    }
  }

  if (candidates.length === 0) return;

  // Deduplicate: one notification per type per scheduled day.
  for (const candidate of candidates) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        type: candidate.type,
        scheduledFor: candidate.scheduledFor,
      },
      select: { id: true },
    });
    if (!existing) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: candidate.type,
          title: candidate.title,
          message: candidate.message,
          scheduledFor: candidate.scheduledFor,
        },
      });
    }
  }

  revalidateReminders();
}
