import "dotenv/config";

/**
 * Database readiness check.
 *
 * Run with:  npm run db:check
 *
 * Answers, in one command, the questions that are otherwise spread across a
 * browser, a SQL editor, and guesswork:
 *
 *   1. Can we connect?                     (and to which database)
 *   2. Are all expected tables present?
 *   3. Is the reference data seeded?
 *
 * Exits non-zero when the database is not ready, so it can be used as a
 * pre-deploy or post-deploy gate.
 *
 * This is the CLI equivalent of GET /api/health, for use where the app is not
 * running yet - for example immediately after `prisma db push`.
 */

import { prisma } from "../lib/db/prisma";
import { REQUIRED_SECURITY_QUESTION_COUNT } from "../lib/constants";

const EXPECTED_TABLES = [
  "User", "Profile", "SecurityQuestion", "UserSecurityAnswer", "Session",
  "PasswordRecoverySession", "AuditEvent", "RateLimitBucket", "Cycle", "Period",
  "FertilityRecord", "DailyLog", "Symptom", "Mood", "WellnessLog", "IntimateLog",
  "Pregnancy", "Reminder", "Notification", "ArticleCategory", "Article",
] as const;

/** Minimum reference rows needed for /register and /education to render. */
const REQUIRED_SECURITY_QUESTIONS = REQUIRED_SECURITY_QUESTION_COUNT;
const REQUIRED_CATEGORIES = 1;

function maskUrl(raw: string | undefined): string {
  if (!raw) return "(not set)";
  try {
    const url = new URL(raw);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return "(unparseable)";
  }
}

async function main() {
  console.log("\nLunara database check\n");
  console.log(`  target: ${maskUrl(process.env.DATABASE_URL)}`);

  // ---- 1. Connectivity --------------------------------------------------
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("  connection: ok");
  } catch (error) {
    console.log("  connection: FAILED");
    console.error(
      `\n  ${error instanceof Error ? error.message : "unknown error"}\n`,
    );
    process.exit(1);
  }

  // ---- 2. Schema --------------------------------------------------------
  const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `;
  const present = new Set(rows.map((row) => row.table_name));
  const missing = EXPECTED_TABLES.filter((table) => !present.has(table));

  if (missing.length > 0) {
    console.log(`  schema: INCOMPLETE (${missing.length} of ${EXPECTED_TABLES.length} missing)`);
    console.log(`\n  Missing: ${missing.join(", ")}\n`);
    console.log("  Fix: npx prisma db push");
    console.log("       (or paste prisma/schema.sql into the Neon SQL Editor)\n");
    process.exit(1);
  }
  console.log(`  schema: ok (${EXPECTED_TABLES.length} tables)`);

  // ---- 3. Reference data ------------------------------------------------
  const [securityQuestions, articleCategories, articles, users] = await Promise.all([
    prisma.securityQuestion.count(),
    prisma.articleCategory.count(),
    prisma.article.count(),
    prisma.user.count({ where: { deletedAt: null } }),
  ]);

  console.log(
    `  reference data: ${securityQuestions} security questions, ` +
      `${articleCategories} categories, ${articles} articles`,
  );
  console.log(`  accounts: ${users}`);

  const problems: string[] = [];
  if (securityQuestions < REQUIRED_SECURITY_QUESTIONS) {
    problems.push(
      `only ${securityQuestions} security questions (need at least ${REQUIRED_SECURITY_QUESTIONS}) - /register cannot render`,
    );
  }
  if (articleCategories < REQUIRED_CATEGORIES) {
    problems.push("no article categories - /education has nothing to group by");
  }

  if (problems.length > 0) {
    console.log("\n  NOT READY:");
    for (const problem of problems) console.log(`    - ${problem}`);
    console.log("\n  Fix: run prisma/setup/reference-data.sql, or `npx prisma db seed`\n");
    process.exit(1);
  }

  if (articles === 0) {
    console.log(
      "\n  Note: no articles yet. The education hub will show its empty state.\n" +
        "  Run `npm run db:seed:content` to load the starter library.\n",
    );
  }

  console.log("\n  Database is ready.\n");
}

main()
  .catch((error) => {
    console.error("\nCheck failed:", error instanceof Error ? error.message : error, "\n");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
