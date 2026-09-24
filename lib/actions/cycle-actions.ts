"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { fromISODate, today, addDays } from "@/lib/dates";
import { sanitizeMultiline } from "@/lib/security/normalize";
import { periodEntrySchema, quickPeriodStartSchema } from "@/lib/validation/schemas";
import {
  errorState,
  successState,
  withErrorHandling,
  type ActionState,
} from "@/lib/actions/types";

/**
 * Period and cycle mutations.
 *
 * TWO RULES THAT APPLY TO EVERY FUNCTION BELOW:
 *
 *  1. Ownership comes from the session. The client sends a period `id`, never a
 *     `userId`. Every write is scoped with `where: { id, userId }`, so passing
 *     another user's id simply matches nothing.
 *
 *  2. Derived data is recalculated, not trusted. When a period is created or
 *     edited, the enclosing cycle row is recomputed from the stored dates, so
 *     `cycleLength` can never drift from the dates it is supposed to describe.
 */

function revalidateTracking() {
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/insights");
  revalidatePath("/fertility");
  revalidatePath("/wellness");
}

/**
 * Recompute the cycle rows implied by the user's period history.
 *
 * A "cycle" here is the interval from one period start to the next. We derive
 * them from period anchors so the two can never disagree. The final, open-ended
 * cycle is stored with a null `endDate` and null `cycleLength`.
 *
 * Kept deliberately simple: it rebuilds the Cycle table for the user from
 * periods, which is cheap at this data volume and removes any chance of a stale
 * derived row surviving an edit.
 */
async function rebuildCyclesFromPeriods(userId: string): Promise<void> {
  const periods = await prisma.period.findMany({
    where: { userId },
    orderBy: { startDate: "asc" },
    select: { startDate: true, endDate: true },
  });

  if (periods.length === 0) {
    await prisma.cycle.deleteMany({ where: { userId } });
    return;
  }

  const rows = periods.map((period, index) => {
    const next = periods[index + 1];
    const periodLength =
      period.endDate !== null
        ? Math.round(
            (period.endDate.getTime() - period.startDate.getTime()) / 86_400_000,
          ) + 1
        : null;

    return {
      userId,
      startDate: period.startDate,
      endDate: next ? next.startDate : null,
      cycleLength: next
        ? Math.round((next.startDate.getTime() - period.startDate.getTime()) / 86_400_000)
        : null,
      periodLength,
    };
  });

  await prisma.$transaction([
    prisma.cycle.deleteMany({ where: { userId } }),
    prisma.cycle.createMany({
      data: rows.map((row) => ({ ...row, estimated: false })),
      skipDuplicates: true,
    }),
  ]);
}

/**
 * Keep the profile's `lastPeriodStart` in sync with the earliest-most-recent
 * anchor, so the calculation engine has a single source of truth even before it
 * reads the period table.
 */
async function syncProfileAnchor(userId: string): Promise<void> {
  const latest = await prisma.period.findFirst({
    where: { userId, startDate: { lte: today() } },
    orderBy: { startDate: "desc" },
    select: { startDate: true },
  });

  await prisma.profile.upsert({
    where: { userId },
    create: { userId, lastPeriodStart: latest?.startDate ?? null },
    update: { lastPeriodStart: latest?.startDate ?? null },
  });
}

// ---------------------------------------------------------------------------
// Create / update
// ---------------------------------------------------------------------------

/**
 * Record a period (start, and optionally an end).
 *
 * Creates a new period, or updates the one that already starts on that date -
 * so a double submission cannot produce two overlapping entries.
 */
export async function savePeriodAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("save-period", async () => {
    const user = await getSessionUser();
    if (!user) return errorState("Your session has expired. Please sign in again.");

    const parsed = periodEntrySchema.safeParse({
      startDate: String(formData.get("startDate") ?? ""),
      endDate: String(formData.get("endDate") ?? "") || undefined,
      notes: String(formData.get("notes") ?? "") || undefined,
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "form";
        if (!errors[key]) errors[key] = issue.message;
      }
      return errorState("Please check the highlighted fields.", errors);
    }

    const startDate = fromISODate(parsed.data.startDate);
    const endDate = parsed.data.endDate ? fromISODate(parsed.data.endDate) : null;

    if (!startDate) {
      return errorState("Enter a valid start date.", { startDate: "Enter a valid date." });
    }
    if (startDate.getTime() > today().getTime()) {
      // A future date is a plan, not a record, and would corrupt every average.
      return errorState("A period cannot start in the future.", {
        startDate: "Choose today or an earlier date.",
      });
    }
    if (endDate && endDate.getTime() > today().getTime()) {
      return errorState("A period cannot end in the future.", {
        endDate: "Choose today or an earlier date.",
      });
    }
    if (endDate && endDate.getTime() < startDate.getTime()) {
      return errorState("The end date cannot be before the start date.", {
        endDate: "Choose a date after the start date.",
      });
    }

    const notes = parsed.data.notes ? sanitizeMultiline(parsed.data.notes) : null;

    await prisma.period.upsert({
      where: { userId_startDate: { userId: user.id, startDate } },
      create: { userId: user.id, startDate, endDate, notes },
      update: { endDate, notes },
    });

    await rebuildCyclesFromPeriods(user.id);
    await syncProfileAnchor(user.id);
    revalidateTracking();

    return successState("Period saved.");
  });
}

/** Mark today (or a chosen date) as the first day of a period. */
export async function markPeriodStartAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("mark-period-start", async () => {
    const user = await getSessionUser();
    if (!user) return errorState("Your session has expired. Please sign in again.");

    const parsed = quickPeriodStartSchema.safeParse({
      date: String(formData.get("date") ?? "") || undefined,
      endPreviousPeriod: formData.get("endPreviousPeriod") === "on",
    });

    const startDate = parsed.success && parsed.data.date ? fromISODate(parsed.data.date) : today();
    if (!startDate) {
      return errorState("Enter a valid date.", { date: "Enter a valid date." });
    }
    if (startDate.getTime() > today().getTime()) {
      return errorState("A period cannot start in the future.", {
        date: "Choose today or an earlier date.",
      });
    }

    const closePrevious = parsed.success && parsed.data.endPreviousPeriod;

    await prisma.$transaction(async (tx) => {
      // Optionally close the previous open period the day before this one starts.
      if (closePrevious) {
        const previous = await tx.period.findFirst({
          where: { userId: user.id, startDate: { lt: startDate }, endDate: null },
          orderBy: { startDate: "desc" },
          select: { id: true },
        });

        if (previous) {
          await tx.period.update({
            where: { id: previous.id },
            data: { endDate: addDays(startDate, -1) },
          });
        }
      }

      await tx.period.upsert({
        where: { userId_startDate: { userId: user.id, startDate } },
        create: { userId: user.id, startDate, endDate: null },
        update: {},
      });
    });

    await rebuildCyclesFromPeriods(user.id);
    await syncProfileAnchor(user.id);
    revalidateTracking();

    return successState("Period start recorded.");
  });
}

/** Close the most recent open-ended period. */
export async function endPeriodAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("end-period", async () => {
    const user = await getSessionUser();
    if (!user) return errorState("Your session has expired. Please sign in again.");

    const requested = String(formData.get("endDate") ?? "");
    const endDate = requested ? fromISODate(requested) : today();
    if (!endDate) {
      return errorState("Enter a valid date.", { endDate: "Enter a valid date." });
    }

    const openPeriod = await prisma.period.findFirst({
      where: { userId: user.id, endDate: null },
      orderBy: { startDate: "desc" },
      select: { id: true, startDate: true },
    });

    if (!openPeriod) {
      return errorState("There is no open period to end. Record a start date first.");
    }

    if (endDate.getTime() < openPeriod.startDate.getTime()) {
      return errorState("The end date cannot be before the start date.", {
        endDate: "Choose a date after the start date.",
      });
    }

    await prisma.period.update({
      where: { id: openPeriod.id, userId: user.id },
      data: { endDate },
    });

    await rebuildCyclesFromPeriods(user.id);
    revalidateTracking();

    return successState("Period ended.");
  });
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

/**
 * Delete a period entry.
 *
 * Scoped by `id` AND `userId`: `deleteMany` is used rather than `delete` so that
 * an id belonging to another account returns "not found" instead of throwing a
 * distinguishable error (which would leak the existence of other users' rows).
 */
export async function deletePeriodAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("delete-period", async () => {
    const user = await getSessionUser();
    if (!user) return errorState("Your session has expired. Please sign in again.");

    const id = String(formData.get("id") ?? "").trim();
    if (!id) return errorState("That entry could not be found.");

    const result = await prisma.period.deleteMany({ where: { id, userId: user.id } });

    if (result.count === 0) {
      return errorState("That entry could not be found.");
    }

    await rebuildCyclesFromPeriods(user.id);
    await syncProfileAnchor(user.id);
    revalidateTracking();

    return successState("Entry deleted.");
  });
}

/** Delete every tracking record for the signed-in user (privacy centre action). */
export async function deleteAllCycleDataAction(
  _prevState: ActionState,
): Promise<ActionState> {
  return withErrorHandling("delete-all-cycle-data", async () => {
    const user = await getSessionUser();
    if (!user) return errorState("Your session has expired. Please sign in again.");

    await prisma.$transaction([
      prisma.period.deleteMany({ where: { userId: user.id } }),
      prisma.cycle.deleteMany({ where: { userId: user.id } }),
      prisma.fertilityRecord.deleteMany({ where: { userId: user.id } }),
    ]);

    await syncProfileAnchor(user.id);
    revalidateTracking();

    return successState("All period and cycle data removed.");
  });
}
