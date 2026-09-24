/**
 * Guards the hand-written setup SQL against drifting from the application.
 *
 * Run with:  npm run verify:sql
 *
 * WHY THIS EXISTS
 * `prisma/setup/reference-data.sql` lets someone create a working database by
 * pasting SQL into the Neon editor, with no local checkout. But the seed script
 * upserts reference rows by a natural key (`SecurityQuestion.question`,
 * `ArticleCategory.slug`). If the SQL's text differed from `lib/constants.ts` by
 * even one character, a later `prisma db seed` would NOT match the existing row
 * and would insert a duplicate instead — leaving users with doubled security
 * questions in the sign-up list.
 *
 * This script asserts the two sources agree, so that divergence fails loudly here
 * instead of quietly in someone's database.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ARTICLE_CATEGORIES, SECURITY_QUESTIONS } from "../lib/constants";

const REFERENCE_SQL = "prisma/setup/reference-data.sql";
const SCHEMA_SQL = "prisma/schema.sql";

let checks = 0;
function check(label: string, fn: () => void) {
  fn();
  checks += 1;
  console.log(`  ok  ${label}`);
}

const referenceSql = readFileSync(REFERENCE_SQL, "utf8");
const schemaSql = readFileSync(SCHEMA_SQL, "utf8");

/**
 * Strip `--` line comments before inspecting the DDL.
 *
 * Without this, documentation that *mentions* a keyword (for example a header
 * note reading "no DROP, TRUNCATE, or DELETE statements") is indistinguishable
 * from the keyword actually being executed, and the safety checks below produce
 * false positives.
 */
function executableSql(sql: string): string {
  return sql.replace(/^\s*--.*$/gm, "");
}

const schemaSqlExecutable = executableSql(schemaSql);

console.log("\nLunara setup SQL parity\n");

// ---------------------------------------------------------------------------
check("every security question appears verbatim in the setup SQL", () => {
  for (const question of SECURITY_QUESTIONS) {
    // SQL escapes a literal apostrophe by doubling it.
    const sqlEscaped = question.replace(/'/g, "''");
    assert.ok(
      referenceSql.includes(`'${sqlEscaped}'`),
      `security question missing or altered in ${REFERENCE_SQL}: "${question}"`,
    );
  }
});

// ---------------------------------------------------------------------------
check("the setup SQL contains no extra security questions", () => {
  // Count rows in the SecurityQuestion insert block by counting id values.
  const block = referenceSql.split("INSERT INTO \"SecurityQuestion\"")[1]?.split(";")[0] ?? "";
  const inserted = [...block.matchAll(/\('sq_[a-z_]+'/g)].length;
  assert.equal(
    inserted,
    SECURITY_QUESTIONS.length,
    `setup SQL inserts ${inserted} security questions but constants define ${SECURITY_QUESTIONS.length}`,
  );
});

// ---------------------------------------------------------------------------
check("every article category name and slug appears in the setup SQL", () => {
  for (const category of ARTICLE_CATEGORIES) {
    assert.ok(
      referenceSql.includes(`'${category.name.replace(/'/g, "''")}'`),
      `category name missing from ${REFERENCE_SQL}: "${category.name}"`,
    );
    assert.ok(
      referenceSql.includes(`'${category.slug}'`),
      `category slug missing from ${REFERENCE_SQL}: "${category.slug}"`,
    );
  }
});

// ---------------------------------------------------------------------------
check("the setup SQL contains no extra categories", () => {
  const block = referenceSql.split("INSERT INTO \"ArticleCategory\"")[1]?.split(";")[0] ?? "";
  const inserted = [...block.matchAll(/\('cat_[a-z_]+'/g)].length;
  assert.equal(
    inserted,
    ARTICLE_CATEGORIES.length,
    `setup SQL inserts ${inserted} categories but constants define ${ARTICLE_CATEGORIES.length}`,
  );
});

// ---------------------------------------------------------------------------
check("the schema DDL creates every Prisma model as a table", () => {
  const schemaPrisma = readFileSync("prisma/schema.prisma", "utf8");

  // Model blocks are `model Name {` at the start of a line.
  const models = [...schemaPrisma.matchAll(/^model\s+(\w+)\s*\{/gm)].map((m) => m[1]);
  assert.ok(models.length > 0, "no models found in schema.prisma");

  for (const model of models) {
    // The generated DDL uses the idempotent form, so accept both spellings.
    const created =
      schemaSqlExecutable.includes(`CREATE TABLE "${model}"`) ||
      schemaSqlExecutable.includes(`CREATE TABLE IF NOT EXISTS "${model}"`);
    assert.ok(
      created,
      `schema.sql is missing a CREATE TABLE for model "${model}" — run \`npm run build:sql\``,
    );
  }
  console.log(`      (${models.length} models verified)`);
});

// ---------------------------------------------------------------------------
check("the schema DDL contains no destructive statements", () => {
  const destructive = /\b(DROP\s+TABLE|DROP\s+TYPE|TRUNCATE|DELETE\s+FROM)\b/i;
  assert.ok(
    !destructive.test(schemaSqlExecutable),
    `${SCHEMA_SQL} contains a destructive statement; it must only create objects`,
  );
});

// ---------------------------------------------------------------------------
check("the schema DDL creates enums before the tables that use them", () => {
  const lastEnum = schemaSqlExecutable.lastIndexOf("CREATE TYPE");
  const firstTable = schemaSqlExecutable.indexOf("CREATE TABLE");
  assert.ok(lastEnum !== -1 && firstTable !== -1, "expected both CREATE TYPE and CREATE TABLE");
  assert.ok(
    lastEnum < firstTable,
    "a CREATE TYPE appears after the first CREATE TABLE; Postgres would reject the ordering",
  );
});

console.log(`\n${checks} checks passed\n`);
