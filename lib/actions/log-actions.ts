"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { fromISODate, today } from "@/lib/dates";
import { sanitizeMultiline } from "@/lib/security/normalize";
import { dailyLogSchema, wellnessLogSchema } from "@/lib/validation/schemas";
import {
  errorState,
  successState,
  withErrorHandling,
  type ActionState,
} from "@/lib/actions/types";
import type { MoodType, SymptomType } from "@/lib/generated/prisma/enums";

/**
 * Daily log and wellness mutations.
 *
 * Write strategy: replace-in-place. The parent DailyLog row is upserted on
 * `(userId, date)`, then its child Symptom and Mood rows are deleted and
 * recreated from the submitted set.
 *
 * Why not diff? Because the submitted set is a complete snapshot of what the
 * user wants recorded for that day. Replacing it is a single round trip, is
 * idempotent (submitting twice gives the same result), and cannot leave orphaned
 * rows behind. Diffs would add complexity for no gain at this scale.
 */

function revalidateLogging() {
  revalidatePath("/log");
  revalidatePath("/dashboard");
  revalidatePath("/wellness");
  revalidatePath("/insights");
}

/** Read the intensity rating for one symptom, if the form supplied one. */
function severityFor(formData: FormData, type: string): number | null {
  const raw = formData.get(`severity_${type}`);
  if (raw === null || raw === "") return null;
  const parsed = Number.parseInt(String(raw), 10);
  if (!Number.isFinite(parsed)) return null;
  const clamped = Math.round(parsed);
  return clamped >= 1 && clamped <= 5 ? clamped : null;
}

// ---------------------------------------------------------------------------
// Daily log
// ---------------------------------------------------------------------------

export async function saveDailyLogAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("save-daily-log", async () => {
    const user = await getSessionUser();
    if (!user) return errorState("Your session has expired. Please sign in again.");

    const symptomTypes = formData
      .getAll("symptoms")
      .map(String)
      .filter((value) => value.length > 0);

    const parsed = dailyLogSchema.safeParse({
      date: String(formData.get("date") ?? ""),
      notes: String(formData.get("notes") ?? "") || undefined,
      symptoms: [...new Set(symptomTypes)].map((type) => ({
        type,
        severity: severityFor(formData, type),
      })),
      moods: formData.getAll("moods").map(String),
      weight: String(formData.get("weight") ?? ""),
      temperature: String(formData.get("temperature") ?? ""),
      sleep: String(formData.get("sleep") ?? ""),
      sleepQuality: String(formData.get("sleepQuality") ?? ""),
      energy: String(formData.get("energy") ?? ""),
      stress: String(formData.get("stress") ?? ""),
      water: String(formData.get("water") ?? ""),
      exerciseMinutes: String(formData.get("exerciseMinutes") ?? ""),
      exercise: String(formData.get("exercise") ?? "") || undefined,
      intimate: {
        logged: formData.get("intimateLogged") === "on",
        activityType: String(formData.get("intimateActivityType") ?? "") || undefined,
        protectionUsed: String(formData.get("intimateProtection") ?? "") || undefined,
        notes: String(formData.get("intimateNotes") ?? "") || undefined,
      },
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "form";
        if (!errors[key]) errors[key] = issue.message;
      }
      return errorState("Please check the highlighted fields.", errors);
    }

    const date = fromISODate(parsed.data.date);
    if (!date) {
      return errorState("Enter a valid date.", { date: "Enter a valid date." });
    }
    if (date.getTime() > today().getTime()) {
      return errorState("You can log today or a past date.", {
        date: "Choose today or an earlier date.",
      });
    }

    const notes = parsed.data.notes ? sanitizeMultiline(parsed.data.notes) : null;
    const intimate = parsed.data.intimate;

    await prisma.$transaction(async (tx) => {
      const log = await tx.dailyLog.upsert({
        where: { userId_date: { userId: user.id, date } },
        create: { userId: user.id, date, notes },
        update: { notes },
        select: { id: true },
      });

      // Replace children rather than diffing them.
      await tx.symptom.deleteMany({ where: { dailyLogId: log.id } });
      await tx.mood.deleteMany({ where: { dailyLogId: log.id } });

      if (parsed.data.symptoms.length > 0) {
        await tx.symptom.createMany({
          data: parsed.data.symptoms.map((symptom) => ({
            dailyLogId: log.id,
            type: symptom.type as SymptomType,
            severity: symptom.severity ?? null,
          })),
          skipDuplicates: true,
        });
      }

      if (parsed.data.moods.length > 0) {
        await tx.mood.createMany({
          data: [...new Set(parsed.data.moods)].map((mood) => ({
            dailyLogId: log.id,
            type: mood as MoodType,
          })),
          skipDuplicates: true,
        });
      }

      // Body and lifestyle metrics live in their own table so wellness can be
      // charted and written independently of the journal entry.
      const hasWellnessValues =
        parsed.data.weight !== undefined ||
        parsed.data.temperature !== undefined ||
        parsed.data.sleep !== undefined ||
        parsed.data.sleepQuality !== undefined ||
        parsed.data.energy !== undefined ||
        parsed.data.stress !== undefined ||
        parsed.data.water !== undefined ||
        parsed.data.exerciseMinutes !== undefined ||
        parsed.data.exercise !== undefined;

      if (hasWellnessValues) {
        const wellnessData = {
          weight: parsed.data.weight ?? null,
          temperature: parsed.data.temperature ?? null,
          sleep: parsed.data.sleep ?? null,
          sleepQuality: parsed.data.sleepQuality ?? null,
          energy: parsed.data.energy ?? null,
          stress: parsed.data.stress ?? null,
          water: parsed.data.water ?? null,
          exerciseMinutes: parsed.data.exerciseMinutes ?? null,
          exercise: parsed.data.exercise ?? null,
        };

        await tx.wellnessLog.upsert({
          where: { userId_date: { userId: user.id, date } },
          create: { userId: user.id, date, ...wellnessData },
          update: wellnessData,
        });
      }

      // Private by default: written only when explicitly opted into, and removed
      // when the user clears the toggle.
      if (intimate?.logged) {
        const intimateData = {
          activityType: intimate.activityType ?? null,
          protectionUsed:
            intimate.protectionUsed === true
              ? true
              : intimate.protectionUsed === false
                ? false
                : null,
          notes: intimate.notes ? sanitizeMultiline(intimate.notes) : null,
        };

        await tx.intimateLog.upsert({
          where: { userId_date: { userId: user.id, date } },
          create: { userId: user.id, date, ...intimateData },
          update: intimateData,
        });
      } else {
        await tx.intimateLog.deleteMany({ where: { userId: user.id, date } });
      }
    });

    revalidateLogging();
    return successState("Today's log saved.");
  });
}

/** Remove a day's log entirely, including its children and wellness entry. */
export async function deleteDailyLogAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("delete-daily-log", async () => {
    const user = await getSessionUser();
    if (!user) return errorState("Your session has expired. Please sign in again.");

    const date = fromISODate(String(formData.get("date") ?? ""));
    if (!date) return errorState("Enter a valid date.");

    await prisma.$transaction([
      prisma.dailyLog.deleteMany({ where: { userId: user.id, date } }),
      prisma.wellnessLog.deleteMany({ where: { userId: user.id, date } }),
      prisma.intimateLog.deleteMany({ where: { userId: user.id, date } }),
    ]);

    revalidateLogging();
    return successState("Log removed for that day.");
  });
}

// ---------------------------------------------------------------------------
// Wellness (also writable from the standalone wellness screen)
// ---------------------------------------------------------------------------

export async function saveWellnessAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("save-wellness", async () => {
    const user = await getSessionUser();
    if (!user) return errorState("Your session has expired. Please sign in again.");

    const parsed = wellnessLogSchema.safeParse({
      date: String(formData.get("date") ?? ""),
      weight: String(formData.get("weight") ?? ""),
      temperature: String(formData.get("temperature") ?? ""),
      sleep: String(formData.get("sleep") ?? ""),
      sleepQuality: String(formData.get("sleepQuality") ?? ""),
      energy: String(formData.get("energy") ?? ""),
      stress: String(formData.get("stress") ?? ""),
      water: String(formData.get("water") ?? ""),
      exerciseMinutes: String(formData.get("exerciseMinutes") ?? ""),
      exercise: String(formData.get("exercise") ?? "") || undefined,
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "form";
        if (!errors[key]) errors[key] = issue.message;
      }
      return errorState("Please check the highlighted fields.", errors);
    }

    const date = fromISODate(parsed.data.date);
    if (!date) return errorState("Enter a valid date.", { date: "Enter a valid date." });
    if (date.getTime() > today().getTime()) {
      return errorState("You can log today or a past date.", {
        date: "Choose today or an earlier date.",
      });
    }

    const data = {
      weight: parsed.data.weight ?? null,
      temperature: parsed.data.temperature ?? null,
      sleep: parsed.data.sleep ?? null,
      sleepQuality: parsed.data.sleepQuality ?? null,
      energy: parsed.data.energy ?? null,
      stress: parsed.data.stress ?? null,
      water: parsed.data.water ?? null,
      exerciseMinutes: parsed.data.exerciseMinutes ?? null,
      exercise: parsed.data.exercise ?? null,
    };

    await prisma.wellnessLog.upsert({
      where: { userId_date: { userId: user.id, date } },
      create: { userId: user.id, date, ...data },
      update: data,
    });

    revalidateLogging();
    return successState("Wellness entry saved.");
  });
}

/** Increment today's water intake from the wellness quick-add buttons. */
export async function addWaterAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("add-water", async () => {
    const user = await getSessionUser();
    if (!user) return errorState("Your session has expired. Please sign in again.");

    const amount = Number.parseInt(String(formData.get("amount") ?? ""), 10);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 5000) {
      return errorState("Choose an amount to add.");
    }

    const requested = String(formData.get("date") ?? "");
    const date = requested ? fromISODate(requested) : today();
    if (!date) return errorState("Enter a valid date.");

    // Read-then-write inside a transaction so two rapid taps cannot lose an
    // increment.
    await prisma.$transaction(async (tx) => {
      const existing = await tx.wellnessLog.findUnique({
        where: { userId_date: { userId: user.id, date } },
        select: { id: true, water: true },
      });

      if (existing) {
        await tx.wellnessLog.update({
          where: { id: existing.id },
          data: { water: (existing.water ?? 0) + amount },
        });
      } else {
        await tx.wellnessLog.create({
          data: { userId: user.id, date, water: amount },
        });
      }
    });

    revalidateLogging();
    return successState(`Added ${amount} ml.`);
  });
}
