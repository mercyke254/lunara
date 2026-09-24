import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

/**
 * Prisma Client singleton.
 *
 * Prisma v7 requires a driver adapter and no longer reads the connection string
 * from schema.prisma, so the URL is supplied here from the environment.
 *
 * The client is created LAZILY on first use. This matters for two reasons:
 *  1. `next build` imports route modules to collect metadata/static params; a
 *     module-level throw on a missing DATABASE_URL would break the build.
 *  2. Development HMR would otherwise leak a new pool on every reload, so the
 *     instance is cached on `globalThis` outside production.
 */

const globalForPrisma = globalThis as unknown as {
  __lunaraPrisma?: PrismaClient;
};

function requireConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url || url.trim().length === 0) {
    throw new Error(
      "DATABASE_URL is not configured. Copy .env.example to .env and set your Neon PostgreSQL connection string.",
    );
  }
  return url;
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: requireConnectionString(),
    // Neon's pooled endpoint brokers connections; a small pool per instance is
    // enough and avoids exhausting the server-side connection limit.
    max: 10,
    idleTimeoutMillis: 30_000,
    // Prisma v6's query engine used a 5s connect timeout; `pg` defaults to 0
    // (wait forever). Restore an explicit bound so a cold Neon compute surfaces
    // as an error rather than a hanging request.
    connectionTimeoutMillis: 10_000,
  });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "production"
        ? ["error"]
        : ["error", "warn"],
  });
}

function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.__lunaraPrisma) {
    globalForPrisma.__lunaraPrisma = createPrismaClient();
  }
  return globalForPrisma.__lunaraPrisma;
}

/**
 * Proxy that defers client construction until a property is actually touched,
 * so importing this module never opens a connection.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client as object, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
  has(_target, property) {
    return property in getPrismaClient();
  },
});

/** Escape hatch for scripts (e.g. the seed) that want an explicit instance. */
export function createStandaloneClient(): PrismaClient {
  return createPrismaClient();
}

export type { PrismaClient };
