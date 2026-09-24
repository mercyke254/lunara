"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { fromISODate, today } from "@/lib/dates";
import {
  errorState,
  successState,
  withErrorHandling,
  type ActionState,
} from "@/lib/actions/types";

/**
 * Fertility marker mutations.
 *
 * Distinction this module exists to preserve:
 *   - `estimated: true`  markers are COMPUTED by the prediction engine
 *   - `estimated: false` markers are OBSERVED by the user (e.g. a positive
 *     ovulation test, or cervical mucus they judged as fertile)
 *
 * Both are stored so the two can be compared later. Observed markers must never
 * be overwritten by a recalculation, and computed markers must never be
 * presented as observations — that distinction is the difference between "the
 * calendar says" and "your body showed", and conflating them would be misleading.
 */

const markerSchema = z.object({
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date."),
  type: z.enum([
    "FERTILE_WINDOW_START",
    "FERTILE_WINDOW_END",
    "OVULATION",
    "PERIOD_START",
    "PERIOD_END",
    "PREDICTED_PERIOD",
  ]),
  note: z.string().trim().max(500).optional(),
});

/** Record a user-observed fertility sign, such as a positive ovulation test. */
export async function addFertilityMarkerAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("add-fertility-marker", async () => {
    const user = await getSessionUser();
    if (!user) return errorState("Your session has expired. Please sign in again.");

    const parsed = markerSchema.safeParse({
      date: String(formData.get("date") ?? ""),
      type: String(formData.get("type") ?? ""),
      note: String(formData.get("note") ?? "") || undefined,
    });

    if (!parsed.success) {
      return errorState(
        "Please check the highlighted fields.",
        Object.fromEntries(
          parsed.error.issues.map((issue) => [issue.path.join(".") || "form", issue.message]),
        ),
      );
    }

    const date = fromISODate(parsed.data.date);
    if (!date) return errorState("Enter a valid date.", { date: "Enter a valid date." });
    if (date.getTime() > today().getTime()) {
      return errorState("You can only record a sign you have already observed.", {
        date: "Choose today or an earlier date.",
      });
    }

    await prisma.fertilityRecord.upsert({
      where: {
        userId_date_type: {
          userId: user.id,
          date,
          type: parsed.data.type,
        },
      },
      create: {
        userId: user.id,
        date,
        type: parsed.data.type,
        // Observed, not computed.
        estimated: false,
        note: parsed.data.note ?? null,
      },
      update: {
        estimated: false,
        note: parsed.data.note ?? null,
      },
    });

    revalidatePath("/fertility");
    revalidatePath("/calendar");

    return successState("Marker recorded as your own observation.");
  });
}

/**
 * Delete a marker.
 * Scoped by `id` AND `userId`; `deleteMany` so another account's id yields
 * "not found" rather than a distinguishable error.
 */
export async function deleteFertilityMarkerAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("delete-fertility-marker", async () => {
    const user = await getSessionUser();
    if (!user) return errorState("Your session has expired. Please sign in again.");

    const id = String(formData.get("id") ?? "").trim();
    if (!id) return errorState("That marker could not be found.");

    const result = await prisma.fertilityRecord.deleteMany({
      where: { id, userId: user.id, estimated: false },
    });

    if (result.count === 0) {
      return errorState("That marker could not be found.");
    }

    revalidatePath("/fertility");
    return successState("Marker removed.");
  });
}

/**
 * Persist the engine's predictions as records so they can be compared against
 * later observations.
 *
 * Existing OBSERVED markers are left untouched: `updateMany` is not used, and
 * the upsert only ever writes rows unique to the predicted types.
 */
export async function snapshotPredictionsAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("snapshot-predictions", async () => {
    const user = await getSessionUser();
    if (!user) return errorState("Your session has expired. Please sign in again.");

    const payload = String(formData.get("payload") ?? "");
    const parsed = z
      .array(
        z.object({
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          type: z.enum(["OVULATION", "PREDICTED_PERIOD"]),
        }),
      )
      .max(24)
      .safeParse(JSON.parse(payload || "[]"));

    if (!parsed.success) {
      return errorState("Those predictions could not be saved.");
    }

    const rows = parsed.data
      .map((entry) => ({ ...entry, date: fromISODate(entry.date) }))
      .filter((entry): entry is { date: Date; type: "OVULATION" | "PREDICTED_PERIOD" } =>
        entry.date !== null,
      );

    if (rows.length === 0) return errorState("There is nothing to save yet.");

    await prisma.fertilityRecord.createMany({
      data: rows.map((row) => ({
        userId: user.id,
        date: row.date,
        type: row.type,
        estimated: true,
      })),
      skipDuplicates: true,
    });

    revalidatePath("/fertility");
    return successState(`${rows.length} predicted dates saved for comparison.`);
  });
}
