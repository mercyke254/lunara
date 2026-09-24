import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/health
 *
 * Liveness and readiness probe. Deliberately reveals nothing about the
 * deployment: no version numbers, no dependency list, no database host, and no
 * error text. A probe only needs "is this instance able to serve requests".
 *
 * The database round trip is a `SELECT 1` equivalent, which proves the Prisma
 * client can reach Neon without exposing any data.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  let databaseReachable = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseReachable = true;
  } catch {
    // Error detail is intentionally swallowed: a probe response must not leak
    // connection strings, hostnames, or driver internals.
    databaseReachable = false;
  }

  const body = {
    status: databaseReachable ? "ok" : "degraded",
    database: databaseReachable ? "reachable" : "unreachable",
    checkedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
  };

  return NextResponse.json(body, {
    status: databaseReachable ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
