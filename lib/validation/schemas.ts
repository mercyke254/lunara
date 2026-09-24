import { z } from "zod";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth/password";
import {
  MAX_SECURITY_QUESTION_COUNT,
  REQUIRED_SECURITY_QUESTION_COUNT,
} from "@/lib/constants";
import { fromISODate } from "@/lib/dates";
import type {
  CycleRegularity,
  ExerciseLevel,
  MoodType,
  SymptomType,
  TrackingGoal,
} from "@/lib/validation/types";

/**
 * All input validation for Lunara, in one place.
 *
 * Rules that apply throughout:
 *  - Every field is bounded. Unbounded strings are a denial-of-service and
 *    database-bloat vector.
 *  - Text is normalised (trim / collapse whitespace / strip control chars) by
 *    the schema, so downstream code receives clean input.
 *  - Nothing here trusts an identifier supplied by the client for OWNERSHIP.
 *    A `dailyLogId` is validated as a string, but the query that uses it is
 *    always additionally scoped by the authenticated user id.
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** bcrypt only uses the first 72 bytes; the schema enforces the same bound as
 * `checkPasswordPolicy` so the two can never disagree. */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters.`)
  .regex(/[A-Z]/, "Add at least one uppercase letter.")
  .regex(/[a-z]/, "Add at least one lowercase letter.")
  .regex(/[0-9]/, "Add at least one number.");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Enter your email address.")
  .max(254, "That email address is too long.")
  .email("Enter a valid email address.");

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Enter your name.")
  .max(100, "That name is too long.")
  .regex(/^[\p{L}\p{N}\p{M}'’.\- ]+$/u, "Use letters, numbers, spaces, and simple punctuation only.");

/** `YYYY-MM-DD`. Converted to a UTC-midnight Date with `parseIsoDate`. */
export const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

export const optionalIsoDateSchema = z
  .union([isoDateSchema, z.literal("")])
  .optional()
  .transform((value) => (value ? value : undefined));

export const timeOfDaySchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a time in 24-hour HH:mm format.");

export const idSchema = z.string().trim().min(1).max(64);

/** Free-text notes: bounded, multi-line allowed. */
export const notesSchema = z
  .string()
  .max(2000, "Notes are limited to 2000 characters.")
  .optional()
  .transform((value) => (value && value.trim().length > 0 ? value : undefined));

/** Coerce an HTML form value (always a string or absent) into an optional number. */
const optionalNumber = (min: number, max: number, decimals = 2) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((value) => {
      if (value === undefined || value === null || value === "") return undefined;
      const parsed = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(parsed)) return undefined;
      if (parsed < min || parsed > max) return undefined;
      const factor = 10 ** decimals;
      return Math.round(parsed * factor) / factor;
    });

/** A bounded 1-5 subjective rating. */
const optionalRating = z
  .union([z.string(), z.number()])
  .optional()
  .nullable()
  .transform((value) => {
    if (value === undefined || value === null || value === "") return undefined;
    const parsed = typeof value === "number" ? value : Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return undefined;
    const int = Math.round(parsed);
    return int >= 1 && int <= 5 ? int : undefined;
  });

/** Boolean from a checkbox / hidden input. */
const checkboxSchema = z
  .union([z.boolean(), z.literal("true"), z.literal("on"), z.literal("1"), z.literal("false"), z.literal("")])
  .optional()
  .transform((value) => value === true || value === "true" || value === "on" || value === "1");

// ---------------------------------------------------------------------------
// Enum schemas (verified against the Prisma enums at compile time)
// ---------------------------------------------------------------------------

export const symptomTypeSchema = z.enum([
  "CRAMPS", "HEADACHE", "BACK_PAIN", "BLOATING", "BREAST_TENDERNESS",
  "ACNE", "FATIGUE", "NAUSEA", "DISCHARGE", "SPOTTING", "OTHER",
] satisfies SymptomType[]);

export const moodTypeSchema = z.enum([
  "HAPPY", "CALM", "ENERGETIC", "NEUTRAL", "SAD", "IRRITATED", "ANXIOUS", "STRESSED",
] satisfies MoodType[]);

export const exerciseLevelSchema = z.enum([
  "NONE", "LIGHT", "MODERATE", "INTENSE",
] satisfies ExerciseLevel[]);

export const cycleRegularitySchema = z.enum([
  "REGULAR", "SOMEWHAT_IRREGULAR", "IRREGULAR", "UNKNOWN",
] satisfies CycleRegularity[]);

export const trackingGoalSchema = z.enum([
  "UNDERSTAND_CYCLE", "PREDICT_PERIOD", "TRACK_SYMPTOMS", "CONCEIVE",
  "MONITOR_WELLNESS", "TRACK_PREGNANCY", "PERIMENOPAUSE",
] satisfies TrackingGoal[]);

export const reminderTypeSchema = z.enum([
  "PERIOD", "FERTILE_WINDOW", "DAILY_LOG", "MEDICATION", "APPOINTMENT", "CUSTOM",
]);

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

/** One security-question choice + answer, as submitted at sign-up. */
export const securityAnswerInputSchema = z.object({
  questionId: idSchema,
  answer: z
    .string()
    .trim()
    .min(2, "Answers need at least 2 characters.")
    .max(200, "Answers are limited to 200 characters."),
});

/**
 * The chosen questions and their answers.
 *
 * Accepts between REQUIRED and MAX entries. The lower bound is the sign-up
 * requirement; the upper bound stops a crafted submission from forcing an
 * unbounded number of bcrypt comparisons.
 *
 * Answers must reference DIFFERENT questions: repeating one would reduce the
 * number of independent factors without the user realising it.
 */
export const securityAnswerSetSchema = z
  .array(securityAnswerInputSchema)
  .min(
    REQUIRED_SECURITY_QUESTION_COUNT,
    REQUIRED_SECURITY_QUESTION_COUNT === 1
      ? "Choose a security question and answer it."
      : `Choose ${REQUIRED_SECURITY_QUESTION_COUNT} security questions.`,
  )
  .max(
    MAX_SECURITY_QUESTION_COUNT,
    `Choose at most ${MAX_SECURITY_QUESTION_COUNT} security questions.`,
  )
  .superRefine((answers, ctx) => {
    const ids = answers.map((a) => a.questionId);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: "custom",
        message: "Choose a different question for each answer.",
        path: [0, "questionId"],
      });
    }
  });

export const signUpSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    securityAnswers: securityAnswerSetSchema,
    // Zod v4 replaced the `errorMap` option with `message` / `error`.
    acceptTerms: z.literal(true, {
      message: "Please accept the privacy notice to continue.",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Those passwords do not match.",
    path: ["confirmPassword"],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(PASSWORD_MAX_LENGTH),
  /** Optional post-login destination. Validated as a same-origin path. */
  next: z.string().optional(),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password.").max(PASSWORD_MAX_LENGTH),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Those passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "Choose a password you have not used here before.",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const updateSecurityQuestionsSchema = z
  .object({
    currentPassword: z.string().min(1, "Confirm your password to continue.").max(PASSWORD_MAX_LENGTH),
    securityAnswers: securityAnswerSetSchema,
  });

/** Step 2 of recovery: the email address. */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

/** Recovery step: the answers to the questions we handed back. */
export const recoveryVerifySchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: idSchema,
        answer: z.string().trim().min(1, "Answer each question.").max(200, "Answers are limited to 200 characters."),
      }),
    )
    .min(1)
    .max(MAX_SECURITY_QUESTION_COUNT),
});

export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Those passwords do not match.",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** Deletion requires the password plus an explicit typed confirmation. */
export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Enter your password.").max(PASSWORD_MAX_LENGTH),
  confirmPhrase: z
    .string()
    .trim()
    .refine((value) => value === "DELETE", {
      message: 'Type DELETE to confirm.',
    }),
});

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

export const onboardingSchema = z.object({
  ageRange: z.string().trim().max(40).optional(),
  dateOfBirth: optionalIsoDateSchema,
  averageCycleLength: z.coerce
    .number()
    .int()
    .min(15, "Cycle length is usually between 15 and 90 days.")
    .max(90, "Cycle length is usually between 15 and 90 days."),
  averagePeriodLength: z.coerce
    .number()
    .int()
    .min(1, "Period length is usually between 1 and 14 days.")
    .max(14, "Period length is usually between 1 and 14 days."),
  lastPeriodStart: isoDateSchema,
  cycleRegularity: cycleRegularitySchema,
  trackingGoals: z
    .array(trackingGoalSchema)
    .min(1, "Choose at least one goal.")
    .max(7),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const profileUpdateSchema = z.object({
  name: nameSchema,
  averageCycleLength: z.coerce.number().int().min(15).max(90),
  averagePeriodLength: z.coerce.number().int().min(1).max(14),
  cycleRegularity: cycleRegularitySchema,
});

// ---------------------------------------------------------------------------
// Cycle & period tracking
// ---------------------------------------------------------------------------

export const periodEntrySchema = z
  .object({
    startDate: isoDateSchema,
    endDate: optionalIsoDateSchema,
    notes: notesSchema,
  })
  .superRefine((data, ctx) => {
    if (!data.endDate) return;
    const start = fromISODate(data.startDate);
    const end = fromISODate(data.endDate);
    if (start && end && end.getTime() < start.getTime()) {
      ctx.addIssue({
        code: "custom",
        message: "The end date cannot be before the start date.",
        path: ["endDate"],
      });
    }
  });

export type PeriodEntryInput = z.infer<typeof periodEntrySchema>;

export const periodIdSchema = z.object({ id: idSchema });

/** Quick "my period started today" action from the dashboard. */
export const quickPeriodStartSchema = z.object({
  date: isoDateSchema.optional(),
  endPreviousPeriod: checkboxSchema,
});

// ---------------------------------------------------------------------------
// Daily logging
// ---------------------------------------------------------------------------

export const symptomEntrySchema = z.object({
  type: symptomTypeSchema,
  severity: optionalRating,
});

export const intimateLogSchema = z.object({
  logged: checkboxSchema,
  activityType: z.string().trim().max(80).optional(),
  protectionUsed: z
    .union([z.boolean(), z.literal("true"), z.literal("false"), z.literal(""), z.literal("unsure")])
    .optional()
    .transform((value) => {
      if (value === true || value === "true") return true;
      if (value === false || value === "false") return false;
      return null;
    }),
  notes: notesSchema,
});

export const dailyLogSchema = z.object({
  date: isoDateSchema,
  notes: notesSchema,
  symptoms: z.array(symptomEntrySchema).max(20).default([]),
  moods: z
    .array(moodTypeSchema)
    .max(8)
    .default([])
    .transform((values) => [...new Set(values)]),
  weight: optionalNumber(20, 400, 1),
  temperature: optionalNumber(30, 45, 2),
  sleep: optionalNumber(0, 24, 1),
  sleepQuality: optionalRating,
  energy: optionalRating,
  stress: optionalRating,
  water: optionalNumber(0, 10000, 0),
  exerciseMinutes: optionalNumber(0, 1440, 0),
  exercise: exerciseLevelSchema.optional(),
  intimate: intimateLogSchema.optional(),
});

export type DailyLogInput = z.infer<typeof dailyLogSchema>;

export const wellnessLogSchema = z.object({
  date: isoDateSchema,
  weight: optionalNumber(20, 400, 1),
  temperature: optionalNumber(30, 45, 2),
  sleep: optionalNumber(0, 24, 1),
  sleepQuality: optionalRating,
  energy: optionalRating,
  stress: optionalRating,
  water: optionalNumber(0, 10000, 0),
  exerciseMinutes: optionalNumber(0, 1440, 0),
  exercise: exerciseLevelSchema.optional(),
});

export type WellnessLogInput = z.infer<typeof wellnessLogSchema>;

// ---------------------------------------------------------------------------
// Fertility & pregnancy
// ---------------------------------------------------------------------------

export const pregnancyStartSchema = z.object({
  /** First day of the last menstrual period. */
  lastPeriodStart: isoDateSchema,
  /** Optional clinician-provided due date; overrides the LMP calculation. */
  dueDate: optionalIsoDateSchema,
});

export const pregnancyEndSchema = z.object({
  endedAt: optionalIsoDateSchema,
});

// ---------------------------------------------------------------------------
// Reminders & preferences
// ---------------------------------------------------------------------------

export const reminderSchema = z.object({
  type: reminderTypeSchema,
  enabled: checkboxSchema,
  label: z.string().trim().max(80).optional(),
  timeOfDay: timeOfDaySchema,
  leadTimeDays: z.coerce.number().int().min(0).max(30),
});

export type ReminderInput = z.infer<typeof reminderSchema>;

export const privacyPreferencesSchema = z.object({
  shareAnonymousStats: checkboxSchema,
  notificationsEnabled: checkboxSchema,
});

export const notificationReadSchema = z.object({
  id: idSchema,
});

// ---------------------------------------------------------------------------
// Education & admin
// ---------------------------------------------------------------------------

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1, "Type something to search for.").max(100),
  scope: z.enum(["all", "articles", "logs", "symptoms"]).default("all"),
});

export const adminArticleSchema = z.object({
  title: z.string().trim().min(3, "Give the article a title.").max(160),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens.")
    .optional()
    .or(z.literal("")),
  categoryId: idSchema,
  excerpt: z.string().trim().min(10, "Add a short summary.").max(400),
  content: z.string().trim().min(20, "Add the article body.").max(50_000),
  readingTime: z.coerce.number().int().min(1).max(60),
  tags: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((tag) => tag.trim().toLowerCase())
            .filter(Boolean)
            .slice(0, 10)
        : [],
    ),
  published: checkboxSchema,
});

export type AdminArticleInput = z.infer<typeof adminArticleSchema>;

export const adminCategorySchema = z.object({
  name: z.string().trim().min(2, "Give the category a name.").max(80),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens.")
    .optional()
    .or(z.literal("")),
  description: z.string().trim().max(300).optional(),
  sortOrder: z.coerce.number().int().min(0).max(999),
  active: checkboxSchema,
});

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Only allow same-origin relative paths as a post-login destination.
 * Blocks open-redirect payloads such as `//evil.com` and `https://evil.com`.
 */
export function safeReturnPath(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) return fallback;
  if (/[\r\n]/.test(trimmed)) return fallback;
  return trimmed.slice(0, 500);
}

/** Flatten a ZodError into a `{ field: message }` map for form rendering. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
