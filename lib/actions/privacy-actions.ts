"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser, revokeSession, invalidateAllSessions } from "@/lib/auth/session";
import { hashIpFromHeaders } from "@/lib/security/ip";
import { recordAuditEvent } from "@/lib/security/audit";
import {
  errorState,
  successState,
  withErrorHandling,
  type ActionState,
} from "@/lib/actions/types";

/**
 * Privacy-centre actions.
 *
 * All of them derive the acting user from the session and scope every write by
 * that id. The only identifier accepted from the client is a session id, and
 * even that is matched together with `userId` so it can only ever affect the
 * caller's own rows.
 */

/** End one session belonging to the signed-in user. */
export async function revokeSessionAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("revoke-session", async () => {
    const user = await getSessionUser();
    if (!user) return errorState("Your session has expired. Please sign in again.");

    const sessionId = String(formData.get("sessionId") ?? "").trim();
    if (!sessionId) return errorState("That session could not be found.");

    const revoked = await revokeSession(user.id, sessionId);

    // Deliberately the same message whether or not the row existed, so this
    // cannot be used to probe for session ids.
    if (!revoked) return errorState("That session could not be found.");

    const requestHeaders = await headers();
    await recordAuditEvent({
      userId: user.id,
      event: "SESSION_REVOKED",
      ipHash: hashIpFromHeaders(requestHeaders),
      userAgent: requestHeaders.get("user-agent"),
    });

    revalidatePath("/privacy");
    return successState("Session ended.");
  });
}

/**
 * End every session except the current one.
 *
 * Implemented as "invalidate all, then re-issue the current session" would be
 * simpler but would rotate the cookie; instead we mark other sessions revoked
 * and leave the caller's session untouched, so the user stays signed in where
 * they are.
 */
export async function revokeOtherSessionsAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("revoke-other-sessions", async () => {
    const user = await getSessionUser();
    if (!user) return errorState("Your session has expired. Please sign in again.");

    const keepSessionId = String(formData.get("keepSessionId") ?? "").trim();

    const result = await prisma.session.updateMany({
      where: {
        userId: user.id,
        revokedAt: null,
        ...(keepSessionId ? { id: { not: keepSessionId } } : {}),
      },
      data: { revokedAt: new Date() },
    });

    const requestHeaders = await headers();
    await recordAuditEvent({
      userId: user.id,
      event: "LOGOUT_ALL",
      ipHash: hashIpFromHeaders(requestHeaders),
      userAgent: requestHeaders.get("user-agent"),
      metadata: { revokedCount: result.count, keptCurrent: Boolean(keepSessionId) },
    });

    revalidatePath("/privacy");
    return successState(
      result.count === 0
        ? "No other sessions were active."
        : `Signed out of ${result.count} other ${result.count === 1 ? "device" : "devices"}.`,
    );
  });
}

/**
 * Remove all tracking data but keep the account.
 *
 * A middle path between "export" and "delete account": someone restarting their
 * tracking should not have to lose their login and recovery questions.
 */
export async function clearTrackingDataAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("clear-tracking-data", async () => {
    const user = await getSessionUser();
    if (!user) return errorState("Your session has expired. Please sign in again.");

    // Require an explicit typed confirmation: this is irreversible.
    const confirmation = String(formData.get("confirmPhrase") ?? "").trim();
    if (confirmation !== "CLEAR") {
      return errorState('Type CLEAR to confirm.', {
        confirmPhrase: "Type CLEAR exactly.",
      });
    }

    await prisma.$transaction([
      prisma.symptom.deleteMany({ where: { dailyLog: { userId: user.id } } }),
      prisma.mood.deleteMany({ where: { dailyLog: { userId: user.id } } }),
      prisma.dailyLog.deleteMany({ where: { userId: user.id } }),
      prisma.wellnessLog.deleteMany({ where: { userId: user.id } }),
      prisma.intimateLog.deleteMany({ where: { userId: user.id } }),
      prisma.fertilityRecord.deleteMany({ where: { userId: user.id } }),
      prisma.cycle.deleteMany({ where: { userId: user.id } }),
      prisma.period.deleteMany({ where: { userId: user.id } }),
      prisma.pregnancy.deleteMany({ where: { userId: user.id } }),
      prisma.notification.deleteMany({ where: { userId: user.id } }),
      prisma.profile.updateMany({
        where: { userId: user.id },
        data: { lastPeriodStart: null },
      }),
    ]);

    const requestHeaders = await headers();
    await recordAuditEvent({
      userId: user.id,
      event: "ACCOUNT_DELETED",
      ipHash: hashIpFromHeaders(requestHeaders),
      userAgent: requestHeaders.get("user-agent"),
      metadata: { scope: "tracking_data_only", accountRetained: true },
    });

    revalidatePath("/privacy");
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    revalidatePath("/insights");

    return successState("All tracking data removed. Your account and login are unchanged.");
  });
}

/** End every session, including the current one. */
export async function signOutEverywhereAction(): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;

  const requestHeaders = await headers();
  await invalidateAllSessions(user.id);

  await recordAuditEvent({
    userId: user.id,
    event: "LOGOUT_ALL",
    ipHash: hashIpFromHeaders(requestHeaders),
    userAgent: requestHeaders.get("user-agent"),
    metadata: { includeCurrent: true },
  });

  // The cookie is now invalid server-side; send the user to sign in.
  const { redirect } = await import("next/navigation");
  redirect("/login?signedOut=all");
}
