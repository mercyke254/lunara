"use client";

import { useActionState } from "react";
import { LogOut, MonitorSmartphone, ShieldOff } from "lucide-react";
import {
  revokeOtherSessionsAction,
  revokeSessionAction,
  signOutEverywhereAction,
} from "@/lib/actions/privacy-actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMedium } from "@/lib/dates";

/**
 * Active session list.
 *
 * Only ever receives the user's own sessions — the server scopes the query by
 * the authenticated id. The current device is labelled and excluded from
 * "sign out other devices", so one button cannot accidentally sign the user out
 * of the page they are looking at.
 *
 * Device labels come from a coarse, server-derived User-Agent summary
 * ("Chrome on macOS"), not from the raw header, and no IP address is shown —
 * only a hashed digest is ever stored.
 */

export interface SessionRecord {
  id: string;
  userAgent: string | null;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
}

export function SessionManager({
  sessions,
  currentSessionId,
}: {
  sessions: SessionRecord[];
  currentSessionId: string | null;
}) {
  const [revokeState, revokeAction] = useActionState(revokeSessionAction, IDLE_STATE);
  const [othersState, othersAction] = useActionState(revokeOtherSessionsAction, IDLE_STATE);

  const otherSessions = sessions.filter((session) => session.id !== currentSessionId);

  return (
    <div className="space-y-5">
      <FormMessage state={revokeState} />
      <FormMessage state={othersState} />

      {sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No active sessions were found for this account.
        </p>
      ) : (
        <ul className="space-y-3">
          {sessions.map((session) => {
            const isCurrent = session.id === currentSessionId;
            return (
              <li
                key={session.id}
                className={
                  isCurrent
                    ? "rounded-2xl border border-primary/40 bg-primary-soft/30 p-4"
                    : "rounded-2xl border border-border bg-card p-4"
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  <MonitorSmartphone
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium">
                    {session.userAgent ?? "Unknown device"}
                  </span>
                  {isCurrent ? (
                    <Badge variant="default" className="font-normal">
                      This device
                    </Badge>
                  ) : null}
                </div>

                <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                  <div>
                    <dt className="sr-only">First active</dt>
                    <dd>Started {formatMedium(session.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Last seen</dt>
                    <dd>Last seen {formatMedium(session.lastSeenAt)}</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Expires</dt>
                    <dd>Expires {formatMedium(session.expiresAt)}</dd>
                  </div>
                </dl>

                {!isCurrent ? (
                  <form action={revokeAction} className="mt-3">
                    <input type="hidden" name="sessionId" value={session.id} />
                    <Button type="submit" variant="outline" size="sm">
                      <LogOut aria-hidden="true" />
                      End this session
                    </Button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 border-t border-border pt-5">
        {currentSessionId && otherSessions.length > 0 ? (
          <form action={othersAction}>
            <input type="hidden" name="keepSessionId" value={currentSessionId} />
            <SubmitButton variant="outline" size="sm" pendingLabel="Signing out…">
              <ShieldOff aria-hidden="true" />
              Sign out {otherSessions.length} other{" "}
              {otherSessions.length === 1 ? "device" : "devices"}
            </SubmitButton>
          </form>
        ) : null}

        <form action={signOutEverywhereAction}>
          <Button type="submit" variant="destructiveOutline" size="sm">
            <LogOut aria-hidden="true" />
            Sign out everywhere
          </Button>
        </form>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Sessions are opaque random tokens; the database stores only a SHA-256 hash
        of each one, so a database leak cannot be replayed as a sign-in. IP
        addresses are never stored in readable form.
      </p>
    </div>
  );
}
