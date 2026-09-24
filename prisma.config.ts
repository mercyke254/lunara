import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma ORM v7 configuration.
 *
 * In v7 the CLI no longer reads `datasource.url` from schema.prisma, and
 * environment variables are not loaded automatically - hence `dotenv/config`.
 * The client is instantiated with a driver adapter in `lib/db/prisma.ts`.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
