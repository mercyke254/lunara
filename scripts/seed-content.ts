/**
 * Content-only seed wrapper.
 *
 * Run with:  npm run db:seed:content
 *
 * Loads the reference data and the article library WITHOUT creating any accounts.
 *
 * WHY A WRAPPER INSTEAD OF AN INLINE ENV VAR
 * The obvious approach is `SEED_CONTENT_ONLY=1 tsx prisma/seed.ts` in
 * package.json, but that prefix syntax is POSIX-only and fails on Windows
 * (`cmd.exe` treats it as a command name). Setting the variable here works
 * everywhere.
 *
 * The variable must be set BEFORE `prisma/seed.ts` is evaluated, because that
 * module runs its work at import time. A static `import` would be hoisted above
 * the assignment, so the dynamic import below is deliberate and load-bearing.
 */

process.env.SEED_CONTENT_ONLY = "1";

await import("../prisma/seed");

// Marks the file as a module. Without at least one import or export, TypeScript
// treats it as a script and rejects top-level await (TS1375).
export {};
