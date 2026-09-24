-- ============================================================================
--  Lunara - database schema (GENERATED FILE - do not edit by hand)
-- ============================================================================
--
--  Regenerate with:
--
--    npm run build:sql
--
--  WHAT THIS IS
--  Complete DDL for a fresh database: all tables, enums, indexes, and foreign
--  keys. Generated from prisma/schema.prisma.
--
--  THIS FILE IS IDEMPOTENT
--  Every statement is safe to run against a database that already has some or
--  all of these objects. Re-running after a partial failure is the intended
--  recovery path, so a half-applied paste can be fixed by pasting it again.
--  (Prisma's raw diff output is NOT idempotent; this script adds the guards.)
--
--  WHEN TO USE IT
--  When you want the schema created without a local Node.js checkout - for
--  example by pasting it into the Neon SQL Editor. The normal workflow is still
--  `npx prisma db push`, which creates the same objects and additionally
--  records schema state in Prisma's own metadata table.
--
--  SAFETY
--  ＊ Creates only. No DROP, TRUNCATE, or DELETE statements.
--  ＊ Creates objects in the default `public` schema.
--  ＊ Contains no credentials, hashes, or personal data.
--
--  IMPORTANT - MATCH THE DATABASE
--  Neon projects can contain several branches, each with its own database. The
--  SQL Editor is scoped to one branch. Make sure you run this against the SAME
--  branch and database that your deployment's DATABASE_URL points at, or the app
--  will still report missing tables.
--
--  AFTER RUNNING THIS
--  Run prisma/setup/reference-data.sql. Without it, /register cannot load its
--  security questions and /education has no categories.
-- ============================================================================

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
-- idempotent: skip if the type already exists
DO $lunara$ BEGIN
  CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $lunara$;

-- CreateEnum
-- idempotent: skip if the type already exists
DO $lunara$ BEGIN
  CREATE TYPE "CycleRegularity" AS ENUM ('REGULAR', 'SOMEWHAT_IRREGULAR', 'IRREGULAR', 'UNKNOWN');
EXCEPTION WHEN duplicate_object THEN NULL; END $lunara$;

-- CreateEnum
-- idempotent: skip if the type already exists
DO $lunara$ BEGIN
  CREATE TYPE "TrackingGoal" AS ENUM ('UNDERSTAND_CYCLE', 'PREDICT_PERIOD', 'TRACK_SYMPTOMS', 'CONCEIVE', 'MONITOR_WELLNESS', 'TRACK_PREGNANCY', 'PERIMENOPAUSE');
EXCEPTION WHEN duplicate_object THEN NULL; END $lunara$;

-- CreateEnum
-- idempotent: skip if the type already exists
DO $lunara$ BEGIN
  CREATE TYPE "SymptomType" AS ENUM ('CRAMPS', 'HEADACHE', 'BACK_PAIN', 'BLOATING', 'BREAST_TENDERNESS', 'ACNE', 'FATIGUE', 'NAUSEA', 'DISCHARGE', 'SPOTTING', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $lunara$;

-- CreateEnum
-- idempotent: skip if the type already exists
DO $lunara$ BEGIN
  CREATE TYPE "MoodType" AS ENUM ('HAPPY', 'CALM', 'ENERGETIC', 'NEUTRAL', 'SAD', 'IRRITATED', 'ANXIOUS', 'STRESSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $lunara$;

-- CreateEnum
-- idempotent: skip if the type already exists
DO $lunara$ BEGIN
  CREATE TYPE "ExerciseLevel" AS ENUM ('NONE', 'LIGHT', 'MODERATE', 'INTENSE');
EXCEPTION WHEN duplicate_object THEN NULL; END $lunara$;

-- CreateEnum
-- idempotent: skip if the type already exists
DO $lunara$ BEGIN
  CREATE TYPE "FertilityRecordType" AS ENUM ('FERTILE_WINDOW_START', 'FERTILE_WINDOW_END', 'OVULATION', 'PREDICTED_PERIOD', 'PERIOD_START', 'PERIOD_END');
EXCEPTION WHEN duplicate_object THEN NULL; END $lunara$;

-- CreateEnum
-- idempotent: skip if the type already exists
DO $lunara$ BEGIN
  CREATE TYPE "ReminderType" AS ENUM ('PERIOD', 'FERTILE_WINDOW', 'DAILY_LOG', 'MEDICATION', 'APPOINTMENT', 'CUSTOM');
EXCEPTION WHEN duplicate_object THEN NULL; END $lunara$;

-- CreateEnum
-- idempotent: skip if the type already exists
DO $lunara$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM ('PERIOD', 'FERTILE_WINDOW', 'DAILY_LOG', 'MEDICATION', 'APPOINTMENT', 'CUSTOM', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL; END $lunara$;

-- CreateEnum
-- idempotent: skip if the type already exists
DO $lunara$ BEGIN
  CREATE TYPE "AuditEventType" AS ENUM ('ACCOUNT_CREATED', 'LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'LOGOUT_ALL', 'SESSION_REVOKED', 'PASSWORD_CHANGED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED', 'SECURITY_QUESTIONS_CHANGED', 'RECOVERY_VERIFICATION_FAILED', 'RECOVERY_LOCKED', 'DATA_EXPORTED', 'ONBOARDING_COMPLETED', 'ACCOUNT_DELETED');
EXCEPTION WHEN duplicate_object THEN NULL; END $lunara$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "dateOfBirth" DATE,
    "onboardedAt" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionsInvalidBefore" TIMESTAMP(3),
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ageRange" TEXT,
    "averageCycleLength" INTEGER NOT NULL DEFAULT 28,
    "averagePeriodLength" INTEGER NOT NULL DEFAULT 5,
    "lastPeriodStart" DATE,
    "cycleRegularity" "CycleRegularity" NOT NULL DEFAULT 'UNKNOWN',
    "trackingGoals" "TrackingGoal"[] DEFAULT ARRAY[]::"TrackingGoal"[],
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "shareAnonymousStats" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SecurityQuestion" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "UserSecurityAnswer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answerHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSecurityAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "ipHash" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PasswordRecoverySession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordRecoverySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AuditEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "event" "AuditEventType" NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "RateLimitBucket" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Cycle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "cycleLength" INTEGER,
    "periodLength" INTEGER,
    "notes" TEXT,
    "estimated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Period" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Period_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "FertilityRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "FertilityRecordType" NOT NULL,
    "estimated" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FertilityRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DailyLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Symptom" (
    "id" TEXT NOT NULL,
    "dailyLogId" TEXT NOT NULL,
    "type" "SymptomType" NOT NULL,
    "severity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Symptom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Mood" (
    "id" TEXT NOT NULL,
    "dailyLogId" TEXT NOT NULL,
    "type" "MoodType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mood_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WellnessLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "weight" DOUBLE PRECISION,
    "temperature" DOUBLE PRECISION,
    "sleep" DOUBLE PRECISION,
    "energy" INTEGER,
    "water" DOUBLE PRECISION,
    "exerciseMinutes" INTEGER,
    "exercise" "ExerciseLevel",
    "sleepQuality" INTEGER,
    "stress" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WellnessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "IntimateLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "activityType" TEXT,
    "protectionUsed" BOOLEAN,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntimateLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Pregnancy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "endedAt" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pregnancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Reminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ReminderType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "label" TEXT,
    "timeOfDay" TEXT NOT NULL DEFAULT '09:00',
    "leadTimeDays" INTEGER NOT NULL DEFAULT 0,
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "scheduledFor" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ArticleCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Article" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "readingTime" INTEGER NOT NULL DEFAULT 5,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Profile_userId_idx" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SecurityQuestion_question_key" ON "SecurityQuestion"("question");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SecurityQuestion_active_idx" ON "SecurityQuestion"("active");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserSecurityAnswer_userId_idx" ON "UserSecurityAnswer"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserSecurityAnswer_questionId_idx" ON "UserSecurityAnswer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "UserSecurityAnswer_userId_questionId_key" ON "UserSecurityAnswer"("userId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Session_userId_revokedAt_idx" ON "Session"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PasswordRecoverySession_tokenHash_key" ON "PasswordRecoverySession"("tokenHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PasswordRecoverySession_userId_idx" ON "PasswordRecoverySession"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PasswordRecoverySession_expiresAt_idx" ON "PasswordRecoverySession"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditEvent_userId_createdAt_idx" ON "AuditEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditEvent_event_createdAt_idx" ON "AuditEvent"("event", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "RateLimitBucket_key_key" ON "RateLimitBucket"("key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Cycle_userId_startDate_idx" ON "Cycle"("userId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Cycle_userId_startDate_key" ON "Cycle"("userId", "startDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Period_userId_startDate_idx" ON "Period"("userId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Period_userId_startDate_key" ON "Period"("userId", "startDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FertilityRecord_userId_date_idx" ON "FertilityRecord"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "FertilityRecord_userId_date_type_key" ON "FertilityRecord"("userId", "date", "type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DailyLog_userId_date_idx" ON "DailyLog"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DailyLog_userId_date_key" ON "DailyLog"("userId", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Symptom_dailyLogId_idx" ON "Symptom"("dailyLogId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Symptom_dailyLogId_type_key" ON "Symptom"("dailyLogId", "type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Mood_dailyLogId_idx" ON "Mood"("dailyLogId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Mood_dailyLogId_type_key" ON "Mood"("dailyLogId", "type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WellnessLog_userId_date_idx" ON "WellnessLog"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WellnessLog_userId_date_key" ON "WellnessLog"("userId", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IntimateLog_userId_date_idx" ON "IntimateLog"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "IntimateLog_userId_date_key" ON "IntimateLog"("userId", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Pregnancy_userId_active_idx" ON "Pregnancy"("userId", "active");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Reminder_userId_enabled_idx" ON "Reminder"("userId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Reminder_userId_type_key" ON "Reminder"("userId", "type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ArticleCategory_name_key" ON "ArticleCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ArticleCategory_slug_key" ON "ArticleCategory"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ArticleCategory_active_sortOrder_idx" ON "ArticleCategory"("active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Article_categoryId_idx" ON "Article"("categoryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Article_published_publishedAt_idx" ON "Article"("published", "publishedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Article_title_idx" ON "Article"("title");

-- AddForeignKey
-- idempotent: skip if the constraint already exists
DO $lunara$ BEGIN
  ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $lunara$;

-- AddForeignKey
-- idempotent: skip if the constraint already exists
DO $lunara$ BEGIN
  ALTER TABLE "UserSecurityAnswer" ADD CONSTRAINT "UserSecurityAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $lunara$;

-- AddForeignKey
-- idempotent: skip if the constraint already exists
DO $lunara$ BEGIN
  ALTER TABLE "UserSecurityAnswer" ADD CONSTRAINT "UserSecurityAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "SecurityQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $lunara$;

-- AddForeignKey
-- idempotent: skip if the constraint already exists
DO $lunara$ BEGIN
  ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $lunara$;

-- AddForeignKey
-- idempotent: skip if the constraint already exists
DO $lunara$ BEGIN
  ALTER TABLE "PasswordRecoverySession" ADD CONSTRAINT "PasswordRecoverySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $lunara$;

-- AddForeignKey
-- idempotent: skip if the constraint already exists
DO $lunara$ BEGIN
  ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $lunara$;

-- AddForeignKey
-- idempotent: skip if the constraint already exists
DO $lunara$ BEGIN
  ALTER TABLE "Cycle" ADD CONSTRAINT "Cycle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $lunara$;

-- AddForeignKey
-- idempotent: skip if the constraint already exists
DO $lunara$ BEGIN
  ALTER TABLE "Period" ADD CONSTRAINT "Period_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $lunara$;

-- AddForeignKey
-- idempotent: skip if the constraint already exists
DO $lunara$ BEGIN
  ALTER TABLE "FertilityRecord" ADD CONSTRAINT "FertilityRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $lunara$;

-- AddForeignKey
-- idempotent: skip if the constraint already exists
DO $lunara$ BEGIN
  ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $lunara$;

-- AddForeignKey
-- idempotent: skip if the constraint already exists
DO $lunara$ BEGIN
  ALTER TABLE "Symptom" ADD CONSTRAINT "Symptom_dailyLogId_fkey" FOREIGN KEY ("dailyLogId") REFERENCES "DailyLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $lunara$;

-- AddForeignKey
-- idempotent: skip if the constraint already exists
DO $lunara$ BEGIN
  ALTER TABLE "Mood" ADD CONSTRAINT "Mood_dailyLogId_fkey" FOREIGN KEY ("dailyLogId") REFERENCES "DailyLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $lunara$;

-- AddForeignKey
-- idempotent: skip if the constraint already exists
DO $lunara$ BEGIN
  ALTER TABLE "WellnessLog" ADD CONSTRAINT "WellnessLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $lunara$;

-- AddForeignKey
-- idempotent: skip if the constraint already exists
DO $lunara$ BEGIN
  ALTER TABLE "IntimateLog" ADD CONSTRAINT "IntimateLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $lunara$;

-- AddForeignKey
-- idempotent: skip if the constraint already exists
DO $lunara$ BEGIN
  ALTER TABLE "Pregnancy" ADD CONSTRAINT "Pregnancy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $lunara$;

-- AddForeignKey
-- idempotent: skip if the constraint already exists
DO $lunara$ BEGIN
  ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $lunara$;

-- AddForeignKey
-- idempotent: skip if the constraint already exists
DO $lunara$ BEGIN
  ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $lunara$;

-- AddForeignKey
-- idempotent: skip if the constraint already exists
DO $lunara$ BEGIN
  ALTER TABLE "Article" ADD CONSTRAINT "Article_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ArticleCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $lunara$;

-- AddForeignKey
-- idempotent: skip if the constraint already exists
DO $lunara$ BEGIN
  ALTER TABLE "Article" ADD CONSTRAINT "Article_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $lunara$;

