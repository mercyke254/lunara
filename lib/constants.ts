import type {
  CycleRegularity,
  ExerciseLevel,
  FertilityRecordType,
  MoodType,
  NotificationType,
  ReminderType,
  SymptomType,
  TrackingGoal,
} from "@/lib/generated/prisma/enums";
import type { CyclePhase } from "@/lib/calculations/cycle";

/**
 * Static, serialisable application data: labels, options, and copy.
 *
 * Everything here is plain data (strings/numbers only) so it can cross the
 * server/client boundary without special handling. Icon components are resolved
 * in the component layer, not here.
 */

export const APP_NAME = "Lunara";
export const APP_TAGLINE = "Understand your cycle. Understand yourself.";
export const APP_DESCRIPTION =
  "Lunara is a private, thoughtful companion for period tracking, cycle insight, and everyday wellness. Log how you feel, see the patterns, and feel more prepared for what is next.";

// ---------------------------------------------------------------------------
// Medical safety copy - used verbatim across the product
// ---------------------------------------------------------------------------

export const DISCLAIMERS = {
  /**
   * Shown anywhere a prediction is displayed.
   */
  ESTIMATE:
    "Estimates are based on the dates you log and typical cycle patterns. Every body is different, so dates can shift.",

  /**
   * Ovulation / fertile window. Must accompany every fertility prediction.
   */
  FERTILITY:
    "Lunara estimates your fertile window from past cycle dates. It cannot confirm ovulation and must not be used as birth control. If you are trying to conceive or avoid pregnancy, talk to a healthcare professional about methods that suit you.",

  /**
   * Pregnancy mode.
   */
  PREGNANCY:
    "Due dates are estimates - only about 4 in 100 babies are born on their due date. Lunara does not provide medical advice. Contact your midwife or doctor with any concern about you or your baby.",

  /**
   * Logging / symptom interpretation.
   */
  SYMPTOMS:
    "Lunara helps you notice patterns in what you record. It does not diagnose conditions and is not a substitute for professional medical care.",

  /**
   * Escalation copy for symptoms that may warrant attention.
   */
  SEEK_CARE:
    "If you have severe pain, very heavy bleeding, bleeding between periods, or symptoms that worry you, please speak to a doctor or midwife. Seek urgent care for sudden severe pain, fainting, or a high fever.",
} as const;

// ---------------------------------------------------------------------------
// Security questions
// ---------------------------------------------------------------------------

/**
 * The seeded catalogue of security questions. Users pick three distinct ones.
 * Questions are memorable facts rather than anything derivable from a profile.
 */
export const SECURITY_QUESTIONS: readonly string[] = [
  "What was the name of your first school?",
  "What city were you born in?",
  "What was the name of your childhood best friend?",
  "What was your first pet's name?",
  "What is your favorite childhood food?",
  "What was your childhood nickname?",
  "What was the name of your first teacher?",
] as const;

/** Users must select exactly this many questions. */
export const REQUIRED_SECURITY_QUESTION_COUNT = 3;

// ---------------------------------------------------------------------------
// Logging options
// ---------------------------------------------------------------------------

export const SYMPTOM_OPTIONS = [
  { value: "CRAMPS", label: "Cramps", group: "Physical" },
  { value: "HEADACHE", label: "Headache", group: "Physical" },
  { value: "BACK_PAIN", label: "Back pain", group: "Physical" },
  { value: "BLOATING", label: "Bloating", group: "Physical" },
  { value: "BREAST_TENDERNESS", label: "Breast tenderness", group: "Physical" },
  { value: "ACNE", label: "Acne", group: "Physical" },
  { value: "FATIGUE", label: "Fatigue", group: "Energy" },
  { value: "NAUSEA", label: "Nausea", group: "Physical" },
  { value: "DISCHARGE", label: "Discharge", group: "Cycle signs" },
  { value: "SPOTTING", label: "Spotting", group: "Cycle signs" },
  { value: "OTHER", label: "Other", group: "Other" },
] as const satisfies readonly { value: SymptomType; label: string; group: string }[];

export const MOOD_OPTIONS = [
  { value: "HAPPY", label: "Happy", tone: "warm" },
  { value: "CALM", label: "Calm", tone: "calm" },
  { value: "ENERGETIC", label: "Energetic", tone: "bright" },
  { value: "NEUTRAL", label: "Neutral", tone: "neutral" },
  { value: "SAD", label: "Sad", tone: "cool" },
  { value: "IRRITATED", label: "Irritated", tone: "warm" },
  { value: "ANXIOUS", label: "Anxious", tone: "cool" },
  { value: "STRESSED", label: "Stressed", tone: "cool" },
] as const satisfies readonly { value: MoodType; label: string; tone: string }[];

export const EXERCISE_OPTIONS = [
  { value: "NONE", label: "Rest day" },
  { value: "LIGHT", label: "Light" },
  { value: "MODERATE", label: "Moderate" },
  { value: "INTENSE", label: "Intense" },
] as const satisfies readonly { value: ExerciseLevel; label: string }[];

/** Symptom intensity is optional; 1-5 keeps the UI simple and the chart usable. */
export const SEVERITY_LABELS: Record<number, string> = {
  1: "Very mild",
  2: "Mild",
  3: "Moderate",
  4: "Strong",
  5: "Severe",
};

export const ENERGY_LABELS: Record<number, string> = {
  1: "Running on empty",
  2: "Low",
  3: "Okay",
  4: "Good",
  5: "Energised",
};

export const STRESS_LABELS: Record<number, string> = {
  1: "Very relaxed",
  2: "Relaxed",
  3: "Manageable",
  4: "Tense",
  5: "Very stressed",
};

export const SLEEP_QUALITY_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Restless",
  3: "Okay",
  4: "Good",
  5: "Excellent",
};

export const DAILY_GOALS = {
  /** General hydration guidance used as a soft daily target. */
  WATER_ML: 2000,
  SLEEP_HOURS: 8,
  EXERCISE_MINUTES: 30,
} as const;

export const WATER_PRESETS_ML = [250, 500, 750, 1000] as const;

// ---------------------------------------------------------------------------
// Logging encouragement
// ---------------------------------------------------------------------------

/**
 * Short notes shown while logging.
 *
 * Constraint: these must stay non-clinical. No claims about health outcomes, no
 * advice that could be mistaken for medical guidance, and nothing that implies
 * a "correct" way to feel. They exist to make the form feel less like a
 * clinical intake sheet.
 */
export const MOTIVATION: readonly string[] = [
  "A single day's entry rarely says much. A month of them shows you a pattern.",
  "Logging on the days you feel fine is just as useful as the difficult ones.",
  "There is no right answer here — record what is true for you.",
  "Patterns often show up across phases rather than within a single day.",
  "You can always come back and change this. Nothing here is permanent.",
  "Skipping a few fields is completely fine. Partial data still helps.",
  "The notes field is often the most useful thing to look back on.",
  "If something worries you, note it — and mention it to a professional.",
] as const;

// ---------------------------------------------------------------------------
// Cycle phases
// ---------------------------------------------------------------------------

export const PHASE_META: Record<
  CyclePhase,
  {
    label: string;
    shortLabel: string;
    /** Tailwind colour token suffix defined in globals.css. */
    colorVar: string;
    summary: string;
    bodyNote: string;
  }
> = {
  MENSTRUAL: {
    label: "Menstrual phase",
    shortLabel: "Period",
    colorVar: "var(--phase-menstrual)",
    summary:
      "Your period. Hormone levels are at their lowest, which is why energy can dip and cramps appear.",
    bodyNote:
      "Rest is productive. Warmth, gentle movement, and iron-rich food help many people feel better.",
  },
  FOLLICULAR: {
    label: "Follicular phase",
    shortLabel: "Follicular",
    colorVar: "var(--phase-follicular)",
    summary:
      "Oestrogen is rising as an egg matures. Many people notice steadier energy and mood in this stretch.",
    bodyNote:
      "Often a good window for harder training and for starting demanding work.",
  },
  OVULATION: {
    label: "Ovulation phase",
    shortLabel: "Ovulation",
    colorVar: "var(--phase-ovulation)",
    summary:
      "Estimated ovulation. Oestrogen peaks and an egg is released. This is an estimate from your cycle dates, not a confirmed event.",
    bodyNote:
      "Some people notice twinges, clearer discharge, or a libido shift around now.",
  },
  LUTEAL: {
    label: "Luteal phase",
    shortLabel: "Luteal",
    colorVar: "var(--phase-luteal)",
    summary:
      "Progesterone rises then falls. This is the phase most associated with PMS-type symptoms.",
    bodyNote:
      "Sleep, steady blood sugar, and magnesium-rich foods are commonly helpful.",
  },
  UNKNOWN: {
    label: "Not enough data",
    shortLabel: "Unknown",
    colorVar: "var(--phase-unknown)",
    summary:
      "Log a period start and Lunara can begin estimating your phases.",
    bodyNote: "",
  },
};

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

export const AGE_RANGES = [
  "Under 18",
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55+",
  "Prefer not to say",
] as const;

export const TRACKING_GOAL_OPTIONS = [
  { value: "UNDERSTAND_CYCLE", label: "Understand my cycle", hint: "See the patterns behind how I feel" },
  { value: "PREDICT_PERIOD", label: "Predict my period", hint: "Know roughly when to expect it" },
  { value: "TRACK_SYMPTOMS", label: "Track symptoms", hint: "Spot what links to what" },
  { value: "CONCEIVE", label: "Trying to conceive", hint: "Understand my fertile window" },
  { value: "MONITOR_WELLNESS", label: "Monitor overall wellness", hint: "Sleep, mood, energy, movement" },
  { value: "TRACK_PREGNANCY", label: "Track a pregnancy", hint: "Weekly updates and appointments" },
  { value: "PERIMENOPAUSE", label: "Perimenopause", hint: "Follow changes over time" },
] as const satisfies readonly { value: TrackingGoal; label: string; hint: string }[];

export const REGULARITY_OPTIONS = [
  { value: "REGULAR", label: "Fairly regular", hint: "Within a few days of the same length each time" },
  { value: "SOMEWHAT_IRREGULAR", label: "Somewhat irregular", hint: "Varies by about a week" },
  { value: "IRREGULAR", label: "Very irregular", hint: "Hard to predict at all" },
  { value: "UNKNOWN", label: "Not sure yet", hint: "I have not been tracking" },
] as const satisfies readonly { value: CycleRegularity; label: string; hint: string }[];

// ---------------------------------------------------------------------------
// Reminders & notifications
// ---------------------------------------------------------------------------

export const REMINDER_TYPE_OPTIONS = [
  {
    value: "PERIOD",
    label: "Period reminders",
    description: "A heads-up before your estimated period start.",
    supportsLeadTime: true,
  },
  {
    value: "FERTILE_WINDOW",
    label: "Fertile window reminders",
    description: "A note when your estimated fertile window opens.",
    supportsLeadTime: true,
  },
  {
    value: "DAILY_LOG",
    label: "Daily logging reminders",
    description: "A gentle nudge to log how you feel.",
    supportsLeadTime: false,
  },
  {
    value: "MEDICATION",
    label: "Medication reminders",
    description: "For supplements, contraception, or prescribed medication.",
    supportsLeadTime: false,
  },
  {
    value: "APPOINTMENT",
    label: "Appointment reminders",
    description: "For check-ups, scans, and follow-ups.",
    supportsLeadTime: true,
  },
  {
    value: "CUSTOM",
    label: "Custom reminders",
    description: "Anything else you want to remember.",
    supportsLeadTime: true,
  },
] as const satisfies readonly {
  value: ReminderType;
  label: string;
  description: string;
  supportsLeadTime: boolean;
}[];

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  PERIOD: "Period",
  FERTILE_WINDOW: "Fertile window",
  DAILY_LOG: "Daily log",
  MEDICATION: "Medication",
  APPOINTMENT: "Appointment",
  CUSTOM: "Custom",
  SYSTEM: "Lunara",
};

// ---------------------------------------------------------------------------
// Fertility markers
// ---------------------------------------------------------------------------

export const FERTILITY_TYPE_LABELS: Record<FertilityRecordType, string> = {
  FERTILE_WINDOW_START: "Fertile window opens",
  FERTILE_WINDOW_END: "Fertile window closes",
  OVULATION: "Estimated ovulation",
  PREDICTED_PERIOD: "Predicted period",
  PERIOD_START: "Period started",
  PERIOD_END: "Period ended",
};

// ---------------------------------------------------------------------------
// Audit events (shown in the privacy centre)
// ---------------------------------------------------------------------------

export const AUDIT_EVENT_LABELS: Record<string, string> = {
  ACCOUNT_CREATED: "Account created",
  LOGIN: "Signed in",
  LOGIN_FAILED: "Failed sign-in attempt",
  LOGOUT: "Signed out",
  LOGOUT_ALL: "Signed out of all devices",
  SESSION_REVOKED: "Session ended remotely",
  PASSWORD_CHANGED: "Password changed",
  PASSWORD_RESET_REQUESTED: "Account recovery started",
  PASSWORD_RESET_COMPLETED: "Password reset completed",
  SECURITY_QUESTIONS_CHANGED: "Security questions changed",
  RECOVERY_VERIFICATION_FAILED: "Recovery verification failed",
  RECOVERY_LOCKED: "Recovery temporarily locked",
  DATA_EXPORTED: "Data exported",
  ONBOARDING_COMPLETED: "Onboarding completed",
  ACCOUNT_DELETED: "Account deleted",
};

// ---------------------------------------------------------------------------
// Privacy preferences
// ---------------------------------------------------------------------------

export const PRIVACY_PREFERENCE_OPTIONS = [
  {
    key: "shareAnonymousStats" as const,
    label: "Share anonymous, aggregated statistics",
    description:
      "Contributes counts only - never your identity, notes, or individual logs. Used to understand which features help.",
  },
] as const;

// ---------------------------------------------------------------------------
// Pregnancy education (week-by-week highlights)
// ---------------------------------------------------------------------------

export const TRIMESTER_LABELS: Record<1 | 2 | 3, string> = {
  1: "First trimester",
  2: "Second trimester",
  3: "Third trimester",
};

/**
 * General, non-diagnostic pregnancy milestones. Content is educational and
 * deliberately avoids clinical claims or instructions.
 */
export const PREGNANCY_WEEK_HIGHLIGHTS: Record<number, string> = Object.fromEntries(
  Array.from({ length: 42 }, (_, i) => {
    const week = i + 1;
    if (week <= 4) {
      return [week, "Very early days. The embryo is implanting and hormone levels are beginning to rise."];
    }
    if (week <= 8) {
      return [week, "A period of rapid development. Many people feel tired, and nausea often starts around now."];
    }
    if (week <= 12) {
      return [week, "Major organs are forming. This is usually when the first scan is offered."];
    }
    if (week <= 16) {
      return [week, "Nausea often eases for many people, and energy can start to return."];
    }
    if (week <= 20) {
      return [week, "Movements may become noticeable. The mid-pregnancy scan is usually around now."];
    }
    if (week <= 24) {
      return [week, "Growth continues steadily. You may notice more movement patterns."];
    }
    if (week <= 28) {
      return [week, "The third trimester approaches. Antenatal appointments often become more frequent."];
    }
    if (week <= 32) {
      return [week, "Baby is gaining weight quickly. Sleep and comfort often need more attention."];
    }
    if (week <= 36) {
      return [week, "Preparations for birth are usually discussed around this stage."];
    }
    if (week <= 40) {
      return [week, "Full term approaches. Rest when you can and keep in touch with your midwife."];
    }
    return [week, "Past the estimated due date. Your midwife will advise on monitoring and next steps."];
  }),
);

// ---------------------------------------------------------------------------
// Education hub categories (seeded into the database)
// ---------------------------------------------------------------------------

export const ARTICLE_CATEGORIES = [
  { name: "Menstrual cycle", slug: "menstrual-cycle", description: "How the cycle works, phase by phase.", sortOrder: 1 },
  { name: "Period health", slug: "period-health", description: "What is typical, what to watch for, and when to ask for help.", sortOrder: 2 },
  { name: "PMS", slug: "pms", description: "Premenstrual symptoms and ways people manage them.", sortOrder: 3 },
  { name: "Ovulation", slug: "ovulation", description: "Ovulation, cycle signs, and what can and cannot be predicted.", sortOrder: 4 },
  { name: "Fertility", slug: "fertility", description: "Conception, timing, and when to seek support.", sortOrder: 5 },
  { name: "Pregnancy", slug: "pregnancy", description: "Trimesters, appointments, and what to expect.", sortOrder: 6 },
  { name: "Nutrition", slug: "nutrition", description: "Food and the cycle, including iron and blood sugar.", sortOrder: 7 },
  { name: "Exercise", slug: "exercise", description: "Moving in a way that fits each phase.", sortOrder: 8 },
  { name: "Sleep", slug: "sleep", description: "Sleep and hormonal change.", sortOrder: 9 },
  { name: "Sexual health", slug: "sexual-health", description: "Contraception, screening, and sexual wellbeing.", sortOrder: 10 },
  { name: "General wellness", slug: "general-wellness", description: "Stress, energy, and everyday self-care.", sortOrder: 11 },
] as const;
