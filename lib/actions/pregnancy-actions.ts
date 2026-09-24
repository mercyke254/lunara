"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { fromISODate, today } from "@/lib/dates";
import { pregnancyStartSchema, pregnancyEndSchema } from "@/lib/validation/schemas";
import {
  estimateDueDateFromLmp,
  estimateLmpFromDueDate,
} from "@/lib/calculations/pregnancy";
import {
  errorState,
  successState,
  withErrorHandling,
  type ActionState,
} from "@/lib/actions/types";

/**
 * Pregnancy mode.
 *
 * Data minimisation: Lunara stores only the LMP date (as the dating anchor) and
 * the due date. It does not ask for or store medical history, test results, or
 * clinical measurements — none of which it needs in order to show a week count
 * and a timeline.
 *
 * Only one pregnancy can be active at a time. Activating a new one deactivates
 * any existing record rather than deleting it, so past timelines are preserved
 * for the user's own reference and for their data export.
 */

function revalidatePregnancy() {
  revalidatePath("/pregnancy");
  revalidatePath("/dashboard");
  revalidatePath("/reminders");
}

export async function startPregnancyAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("start-pregnancy", async () => {
    const user = await getSessionUser();
    if (!user) return errorState("Your session has expired. Please sign in again.");

    const parsed = pregnancyStartSchema.safeParse({
      lastPeriodStart: String(formData.get("lastPeriodStart") ?? ""),
      dueDate: String(formData.get("dueDate") ?? "") || undefined,
    });

    if (!parsed.success) {
      return errorState(
        "Please check the highlighted fields.",
        Object.fromEntries(
          parsed.error.issues.map((issue) => [issue.path.join(".") || "form", issue.message]),
        ),
      );
    }

    const providedLmp = fromISODate(parsed.data.lastPeriodStart);
    if (!providedLmp) {
      return errorState("Enter a valid date.", {
        lastPeriodStart: "Enter a valid date.",
      });
    }

    const providedDueDate = parsed.data.dueDate ? fromISODate(parsed.data.dueDate) : null;

    if (providedLmp.getTime() > today().getTime() && !providedDueDate) {
      return errorState("The last period date cannot be in the future.", {
        lastPeriodStart: "Choose today or an earlier date.",
      });
    }

    // A clinician-provided due date wins over the LMP calculation. When only a
    // due date is known, the LMP anchor is derived from it.
    const dueDate = providedDueDate ?? estimateDueDateFromLmp(providedLmp);
    const startDate = providedDueDate ? estimateLmpFromDueDate(providedDueDate) : providedLmp;

    await prisma.$transaction(async (tx) => {
      // Preserve history: deactivate rather than delete.
      await tx.pregnancy.updateMany({
        where: { userId: user.id, active: true },
        data: { active: false, endedAt: today() },
      });

      await tx.pregnancy.create({
        data: {
          userId: user.id,
          startDate,
          dueDate,
          active: true,
        },
      });
    });

    revalidatePregnancy();
    return successState("Pregnancy mode is on. Estimates are dated from your last period unless a due date was provided.");
  });
}

/** End pregnancy mode (birth, loss, or simply stopping tracking). */
export async function endPregnancyAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("end-pregnancy", async () => {
    const user = await getSessionUser();
    if (!user) return errorState("Your session has expired. Please sign in again.");

    const parsed = pregnancyEndSchema.safeParse({
      endedAt: String(formData.get("endedAt") ?? "") || undefined,
    });

    const endedAt = parsed.success && parsed.data.endedAt ? fromISODate(parsed.data.endedAt) : today();
    if (!endedAt) return errorState("Enter a valid date.");

    const result = await prisma.pregnancy.updateMany({
      where: { userId: user.id, active: true },
      data: { active: false, endedAt },
    });

    if (result.count === 0) {
      return errorState("There is no active pregnancy record to close.");
    }

    revalidatePregnancy();
    return successState("Pregnancy mode is off. Your timeline has been kept in your records.");
  });
}

/**
 * Permanently delete a pregnancy record.
 * Scoped by id AND userId.
 */
export async function deletePregnancyAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("delete-pregnancy", async () => {
    const user = await getSessionUser();
    if (!user) return errorState("Your session has expired. Please sign in again.");

    const id = String(formData.get("id") ?? "").trim();
    if (!id) return errorState("That record could not be found.");

    const result = await prisma.pregnancy.deleteMany({ where: { id, userId: user.id } });
    if (result.count === 0) return errorState("That record could not be found.");

    revalidatePregnancy();
    return successState("Record deleted.");
  });
}
