import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/health
 *
 * Readiness probe. It answers three separate questions, because they fail
 * independently and conflating them wastes a lot of debugging time:
 *
 *   1. Is the database reachable?      -> `database`
 *   2. Does the schema exist?          -> `schema` + `missingTables`
 *   3. Is the reference data seeded?   -> `referenceData`
 *
 * A `SELECT 1` probe only answers (1). A reachable database with no tables still
 * reports "ok", which is exactly the misleading case this endpoint now separates
 * out: every route that only touches the connection works, while every route that
 * reads a table fails.
 *
 * DISCLOSURE. This reports table NAMES of missing tables and counts of reference
 * rows. No personal data, no health data, no credentials, and no counts taken
 * from user tables. Table names are already public in prisma/schema.prisma, so
 * this adds no meaningful information to an attacker while making the operator's
 * problem obvious.
 */
export const dynamic = "force-dynamic";

/**
 * Tables Lunara expects to exist. Kept in sync with prisma/schema.prisma; the
 * `verify:sql` script asserts that the generated DDL creates every model.
 */
const EXPECTED_TABLES = [
  "User",
  "Profile",
  "SecurityQuestion",
  "UserSecurityAnswer",
  "Session",
  "PasswordRecoverySession",
  "AuditEvent",
  "RateLimitBucket",
  "Cycle",
  "Period",
  "FertilityRecord",
  "DailyLog",
  "Symptom",
  "Mood",
  "WellnessLog",
  "IntimateLog",
  "Pregnancy",
  "Reminder",
  "Notification",
  "ArticleCategory",
  "Article",
] as const;

interface SchemaStatus {
  schema: "ready" | "missing_tables" | "unreachable";
  missingTables: string[];
}

async function inspectSchema(): Promise<SchemaStatus> {
  try {
    const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `;

    const present = new Set(rows.map((row) => row.table_name));
    const missingTables = EXPECTED_TABLES.filter((table) => !present.has(table));

    return {
      schema: missingTables.length === 0 ? "ready" : "missing_tables",
      missingTables,
    };
  } catch {
    // Even information_schema is unreachable, so nothing about the schema can be
    // asserted.
    return { schema: "unreachable", missingTables: [...EXPECTED_TABLES] };
  }
}

async function inspectReferenceData(): Promise<
  { securityQuestions: number; articleCategories: number; articles: number } | "unknown"
> {
  try {
    const [securityQuestions, articleCategories, articles] = await Promise.all([
      prisma.securityQuestion.count(),
      prisma.articleCategory.count(),
      prisma.article.count(),
    ]);
    return { securityQuestions, articleCategories, articles };
  } catch {
    // Expected when the tables do not exist yet.
    return "unknown";
  }
}

export async function GET() {
  const startedAt = Date.now();

  let databaseReachable = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseReachable = true;
  } catch {
    // Detail is deliberately swallowed: a probe must not leak connection
    // strings, hostnames, or driver internals.
    databaseReachable = false;
  }

  const schemaStatus: SchemaStatus = databaseReachable
    ? await inspectSchema()
    : { schema: "unreachable", missingTables: [...EXPECTED_TABLES] };

  const referenceData = databaseReachable ? await inspectReferenceData() : "unknown";

  // Guidance so the response is actionable on its own, without needing the README.
  let hint: string | null = null;
  if (!databaseReachable) {
    hint =
      "DATABASE_URL is missing or wrong. On Vercel: Settings -> Environment Variables, then redeploy.";
  } else if (schemaStatus.schema === "missing_tables") {
    hint =
      "The schema has not been created on the database this deployment is using. Run `npx prisma db push` locally, or paste prisma/schema.sql into the Neon SQL Editor for THIS branch and database.";
  } else if (
    referenceData !== "unknown" &&
    (referenceData.securityQuestions === 0 || referenceData.articleCategories === 0)
  ) {
    hint =
      "Tables exist but reference data is missing, so /register cannot render. Run prisma/setup/reference-data.sql (or `npx prisma db seed`).";
  }

  const healthy = databaseReachable && schemaStatus.schema === "ready" && hint === null;

  const body = {
    status: healthy ? "ok" : "degraded",
    database: databaseReachable ? "reachable" : "unreachable",
    schema: schemaStatus.schema,
    missingTables: schemaStatus.missingTables,
    referenceData,
    hint,
    checkedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
  };

  return NextResponse.json(body, {
    status: healthy ? 200 : 503,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
