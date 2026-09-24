import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { generateToken, hashToken } from "@/lib/security/tokens";
import { describeUserAgent } from "@/lib/security/ip";
import type { Role } from "@/lib/generated/prisma/enums";

/**
 * Session management.
 *
 * Model: an opaque 256-bit random token in an httpOnly cookie. The database
 * stores only the SHA-256 digest, so leaked database contents cannot be replayed
 * as a session.
 *
 * Invalidation happens on three independent axes, and a session must satisfy
 * all of them:
 *   1. `expiresAt`                 - absolute lifetime (30 days)
 *   2. `revokedAt`                 - explicit sign-out / remote revoke
 *   3. `User.sessionsInvalidBefore` - "sign out everywhere", password reset,
 *                                     account deletion
 *
 * Deliberately NOT used: stateless JWT cookies. A signed cookie cannot be
 * revoked server-side, and "invalidate existing sessions after a password
 * reset" is an explicit requirement, so sessions must be stateful.
 */

export const SESSION_COOKIE_NAME = "lunara_session";

/** Absolute session lifetime: 30 days. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/**
 * Grace period when comparing timestamps.
 *
 * `Session.createdAt` and `User.sessionsInvalidBefore` can land in the same
 * millisecond (a session created immediately after a password change), and a
 * strict `>` comparison would then wrongly kill the fresh session. Requests also
 * race. One second of tolerance removes that class of false rejection without
 * meaningfully extending a revoked session's life.
 */
const TIMESTAMP_GRACE_MS = 1000;

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  onboardedAt: Date | null;
}

function cookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    // Secure cookies require HTTPS; disabled in development so localhost works.
    secure: process.env.NODE_ENV === "production",
    // "lax" (not "none") so the cookie is not sent on cross-site requests,
    // which is the primary CSRF defence for cookie-based auth.
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

/**
 * Create a session row and set the cookie.
 * Returns the raw token so callers that need it (e.g. tests) can assert on it;
 * it is never persisted in plaintext.
 */
export async function createSession(
  userId: string,
  requestHeaders?: Headers,
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken(32);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  const userAgent = requestHeaders?.get("user-agent") ?? null;

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      userAgent: userAgent ? describeUserAgent(userAgent) : null,
    },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, cookieOptions(expiresAt));

  return { token, expiresAt };
}

/** Remove the session cookie from the browser. */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

function isValidSessionTimestamp(
  sessionCreatedAt: Date,
  invalidBefore: Date | null,
): boolean {
  if (!invalidBefore) return true;
  return sessionCreatedAt.getTime() + TIMESTAMP_GRACE_MS >= invalidBefore.getTime();
}

/**
 * Resolve the signed-in user from the session cookie.
 * Returns null for any invalid/expired/revoked/missing session - callers must
 * treat null as "not authenticated" and never fall back to a trust-the-client
 * path.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      createdAt: true,
      expiresAt: true,
      revokedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          onboardedAt: true,
          deletedAt: true,
          sessionsInvalidBefore: true,
          passwordChangedAt: true,
        },
      },
    },
  });

  if (!session) return null;
  if (session.revokedAt) return null;

  const now = Date.now();
  if (session.expiresAt.getTime() <= now) return null;

  const { user } = session;
  if (user.deletedAt) return null;

  if (!isValidSessionTimestamp(session.createdAt, user.sessionsInvalidBefore)) {
    return null;
  }
  // A session issued before the current password was set is no longer trusted.
  if (!isValidSessionTimestamp(session.createdAt, user.passwordChangedAt)) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    onboardedAt: user.onboardedAt,
  };
}

/**
 * Best-effort "last seen" update.
 * Only called from mutating server actions: a Server Component render must not
 * write, and a read path should not make every page view a database write.
 */
export async function touchSession(): Promise<void> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return;
    await prisma.session.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { lastSeenAt: new Date() },
    });
  } catch {
    // Non-fatal.
  }
}

/** Revoke the current session ("sign out"). */
export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await prisma.session.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  await clearSessionCookie();
}

/**
 * Invalidate every session for a user ("sign out of all devices", password
 * reset, account deletion).
 *
 * Sets a hard floor rather than only marking existing rows, so sessions that
 * were created but not yet observed are also rejected.
 */
export async function invalidateAllSessions(userId: string): Promise<number> {
  const now = new Date();

  const result = await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: now },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { sessionsInvalidBefore: now },
  });

  return result.count;
}

/**
 * The id of the session behind the current request.
 *
 * Used by the privacy centre to mark "this device" in the session list and to
 * exclude it from "sign out other devices". Returns null when there is no valid
 * session, so callers must handle that rather than assuming a value.
 */
export async function getCurrentSessionId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, revokedAt: true, expiresAt: true },
  });

  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;

  return session.id;
}

/** Sessions for the privacy centre's "Active sessions" list. */
export async function listActiveSessions(userId: string) {
  return prisma.session.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { lastSeenAt: "desc" },
    select: {
      id: true,
      userAgent: true,
      createdAt: true,
      lastSeenAt: true,
      expiresAt: true,
      // `tokenHash` is intentionally never selected.
    },
  });
}

/**
 * Revoke one session by id, scoped to the owner.
 * Returns false when the session does not belong to the user, so the caller
 * cannot use this as an existence oracle for other users' sessions.
 */
export async function revokeSession(
  userId: string,
  sessionId: string,
): Promise<boolean> {
  const result = await prisma.session.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count > 0;
}

/** Delete expired/revoked session rows. Called opportunistically. */
export async function pruneDeadSessions(): Promise<void> {
  try {
    await prisma.session.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
          { revokedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        ],
      },
    });
  } catch {
    // Non-fatal.
  }
}
