/**
 * Generates prisma/schema.sql from the Prisma schema.
 *
 * Run with:  npm run build:sql
 *
 * WHY A SCRIPT INSTEAD OF ONE prisma COMMAND
 * `prisma migrate diff` emits idempotency-blind DDL: plain `CREATE TYPE` and
 * `CREATE TABLE`. That is fine for `prisma db push` (which diffs first), but it
 * is hostile to the paste-into-a-SQL-editor workflow, where a retry after any
 * partial failure hits "type already exists" and aborts before creating tables.
 *
 * This script takes that raw DDL and makes every statement safe to re-run:
 *
 *   CREATE TYPE x AS ENUM (...)  ->  wrapped in a DO block that swallows
 *                                    duplicate_object (SQLSTATE 42710)
 *   CREATE TABLE x               ->  CREATE TABLE IF NOT EXISTS x
 *   CREATE [UNIQUE] INDEX x      ->  CREATE [UNIQUE] INDEX IF NOT EXISTS x
 *   ALTER TABLE x ADD CONSTRAINT ->  wrapped in a DO block (Postgres has no
 *                                    ADD CONSTRAINT IF NOT EXISTS)
 *
 * The result is idempotent, so running it twice is a no-op rather than an error,
 * and a half-applied run is recoverable by simply running it again.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const SCHEMA = "prisma/schema.prisma";
const OUTPUT = "prisma/schema.sql";

/** Dollar-quote tag; unlikely to appear inside generated DDL. */
const TAG = "$lunara$";

function generateRawDdl(): string {
  // The Prisma CLI is invoked through its entry point rather than `npx`, because
  // node_modules/.bin is not guaranteed to exist in every environment this runs in.
  const raw = execFileSync(
    process.execPath,
    [
      "node_modules/prisma/build/index.js",
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema",
      SCHEMA,
      "--script",
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  return raw;
}

/** Wrap a statement so an existing object raises no error. */
function wrapIdempotent(statement: string, comment: string): string {
  const indented = statement
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");

  return [
    `-- idempotent: ${comment}`,
    `DO ${TAG} BEGIN`,
    indented,
    `EXCEPTION WHEN duplicate_object THEN NULL; END ${TAG};`,
  ].join("\n");
}

function makeIdempotent(ddl: string): string {
  const lines = ddl.split("\n");
  const out: string[] = [];

  let index = 0;
  while (index < lines.length) {
    const line = lines[index];

    // ---- CREATE TYPE (enums) --------------------------------------------
    if (line.startsWith("CREATE TYPE")) {
      const statement: string[] = [];
      while (index < lines.length) {
        statement.push(lines[index]);
        if (/\);\s*$/.test(lines[index])) break;
        index += 1;
      }
      out.push(wrapIdempotent(statement.join("\n"), "skip if the type already exists"));
      index += 1;
      continue;
    }

    // ---- CREATE TABLE ---------------------------------------------------
    if (line.startsWith("CREATE TABLE ")) {
      out.push(line.replace("CREATE TABLE ", "CREATE TABLE IF NOT EXISTS "));
      index += 1;
      continue;
    }

    // ---- Indexes --------------------------------------------------------
    if (line.startsWith("CREATE UNIQUE INDEX ")) {
      out.push(line.replace("CREATE UNIQUE INDEX ", "CREATE UNIQUE INDEX IF NOT EXISTS "));
      index += 1;
      continue;
    }

    if (line.startsWith("CREATE INDEX ")) {
      out.push(line.replace("CREATE INDEX ", "CREATE INDEX IF NOT EXISTS "));
      index += 1;
      continue;
    }

    // ---- Foreign keys ---------------------------------------------------
    if (line.startsWith("ALTER TABLE ") && line.includes("ADD CONSTRAINT")) {
      const statement: string[] = [];
      while (index < lines.length) {
        statement.push(lines[index]);
        if (/;\s*$/.test(lines[index])) break;
        index += 1;
      }
      out.push(
        wrapIdempotent(statement.join("\n"), "skip if the constraint already exists"),
      );
      index += 1;
      continue;
    }

    out.push(line);
    index += 1;
  }

  return out.join("\n");
}

const HEADER = `-- ============================================================================
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
--  \`npx prisma db push\`, which creates the same objects and additionally
--  records schema state in Prisma's own metadata table.
--
--  SAFETY
--  ＊ Creates only. No DROP, TRUNCATE, or DELETE statements.
--  ＊ Creates objects in the default \`public\` schema.
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

`;

const rawDdl = generateRawDdl();
const idempotent = makeIdempotent(rawDdl);

writeFileSync(OUTPUT, HEADER + idempotent, "utf8");

const body = readFileSync(OUTPUT, "utf8");
const count = (pattern: RegExp) => (body.match(pattern) ?? []).length;

console.log(`Wrote ${OUTPUT}`);
console.log(`  CREATE TABLE IF NOT EXISTS : ${count(/CREATE TABLE IF NOT EXISTS/g)}`);
console.log(`  CREATE TYPE (guarded)      : ${count(/CREATE TYPE/g)}`);
console.log(`  CREATE INDEX IF NOT EXISTS : ${count(/CREATE INDEX IF NOT EXISTS/g)}`);
console.log(`  CREATE UNIQUE IF NOT EXISTS: ${count(/CREATE UNIQUE INDEX IF NOT EXISTS/g)}`);
console.log(`  FK constraints (guarded)   : ${count(/ADD CONSTRAINT/g)}`);
console.log(`  DO blocks (total)          : ${count(/^DO \$lunara\$ BEGIN/gm)}`);
