import { prisma } from "@/lib/db/prisma";
import type { AuditEventType } from "@/lib/generated/prisma/enums";
import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * Audit trail for sensitive account actions.
 *
 * WHAT IS RECORDED: that an action happened, when, and coarse context
 * (pseudonymised IP, device label, non-identifying metadata).
 *
 * WHAT IS NEVER RECORDED: passwords, security-question answers, session tokens,
 * recovery tokens, password/answer hashes, or raw IP addresses. The `metadata`
 * field is explicitly typed as `Record<string, unknown>` but must only ever
 * carry non-sensitive scalars - never credentials.
 *
 * Audit writes never throw into the caller's flow: losing an audit row must not
 * break a login or a password reset.
 */

export interface AuditInput {
  /** Null for events with no resolvable account (e.g. failed login, unknown email). */
  userId?: string | null;
  event: AuditEventType;
  ipHash?: string | null;
  userAgent?: string | null;
  /** Non-sensitive context only. Never pass secrets or hashes. */
  metadata?: Record<string, unknown> | null;
}

const FORBIDDEN_METADATA_KEYS = new Set([
  "password",
  "newpassword",
  "currentpassword",
  "confirmpassword",
  "answer",
  "securityanswer",
  "answers",
  "token",
  "sessiontoken",
  "recoverytoken",
  "tokenhash",
  "passwordhash",
  "answerhash",
  "secret",
  "authsecret",
]);

/**
 * Strip any key that looks like a credential before it reaches the database.
 * This is a safety net: callers should not pass such keys at all, but a
 * mis-typed field must not become a persisted secret.
 */
function scrubMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!metadata) return null;
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (FORBIDDEN_METADATA_KEYS.has(key.toLowerCase())) continue;
    if (value === undefined) continue;
    safe[key] = value;
  }
  return Object.keys(safe).length > 0 ? safe : null;
}

export async function recordAuditEvent(input: AuditInput): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        userId: input.userId ?? null,
        event: input.event,
        ipHash: input.ipHash ?? null,
        userAgent: input.userAgent?.slice(0, 300) ?? null,
        metadata: (scrubMetadata(input.metadata) ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
      },
    });
  } catch (error) {
    // Never surface or rethrow - authentication must not depend on the log.
    console.error(
      "[lunara:audit] failed to persist audit event",
      input.event,
      error instanceof Error ? error.message : "unknown error",
    );
  }
}

/** Recent audit events for the viewer's own account (privacy centre). */
export async function getRecentAuditEvents(userId: string, take = 20) {
  return prisma.auditEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      event: true,
      createdAt: true,
      userAgent: true,
      // Deliberately no ipHash / metadata on this projection.
    },
  });
}
