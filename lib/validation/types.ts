/**
 * Re-exported enum types from the generated Prisma client.
 *
 * Validation schemas use these with `satisfies` so that a typo in a literal
 * array (e.g. "BREAST_TENDERNES") becomes a compile error rather than a runtime
 * validation gap. This is a TYPE-ONLY module - it adds nothing to the client
 * bundle.
 */

export type {
  Role,
  CycleRegularity,
  TrackingGoal,
  SymptomType,
  MoodType,
  ExerciseLevel,
  FertilityRecordType,
  ReminderType,
  NotificationType,
  AuditEventType,
} from "@/lib/generated/prisma/enums";

/** Keys of the user-controlled privacy preferences. */
export type PrivacyPreferenceKey = "shareAnonymousStats" | "notificationsEnabled";
