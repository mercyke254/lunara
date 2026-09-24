import type { Metadata } from "next";
import Link from "next/link";
import {
  Download,
  Fingerprint,
  KeyRound,
  ScrollText,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PrivacyPreferencesForm } from "@/components/privacy/privacy-preferences-form";
import { SessionManager } from "@/components/privacy/session-manager";
import { DeleteAccountForm } from "@/components/privacy/delete-account-form";
import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { SecurityQuestionsForm } from "@/components/forms/security-questions-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { requireUser, getProfileSummary } from "@/lib/auth/current-user";
import { listActiveSessions, getCurrentSessionId } from "@/lib/auth/session";
import { getRecentAuditEvents } from "@/lib/security/audit";
import { prisma } from "@/lib/db/prisma";
import { formatMedium } from "@/lib/dates";
import { AUDIT_EVENT_LABELS, DISCLAIMERS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy centre",
  description:
    "Export your data, review active sessions, manage preferences, and delete your account.",
};

export const dynamic = "force-dynamic";

/**
 * Privacy centre.
 *
 * Everything the user can do about their own data lives on one screen: read it,
 * take it with them, review access, restrict what is shared, change credentials,
 * or remove it. Grouping it this way is a deliberate product decision — a
 * privacy promise scattered across five settings screens is not a promise a user
 * can verify.
 */
export default async function PrivacyPage() {
  const user = await requireUser();

  const [sessions, currentSessionId, profile, auditEvents, questions, answers, counts] =
    await Promise.all([
      listActiveSessions(user.id),
      getCurrentSessionId(),
      getProfileSummary(user.id),
      getRecentAuditEvents(user.id, 15),
      prisma.securityQuestion.findMany({
        where: { active: true },
        orderBy: { question: "asc" },
        select: { id: true, question: true },
      }),
      prisma.userSecurityAnswer.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
        select: { questionId: true },
      }),
      Promise.all([
        prisma.dailyLog.count({ where: { userId: user.id } }),
        prisma.period.count({ where: { userId: user.id } }),
        prisma.wellnessLog.count({ where: { userId: user.id } }),
      ]),
    ]);

  const [dailyLogCount, periodCount, wellnessCount] = counts;

  return (
    <>
      <PageHeader
        title="Privacy centre"
        description="Your data, and exactly what Lunara does with it. Everything here is self-service — no request form, no waiting period."
      />

      {/* ---- What we store --------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
            What is stored, and what is not
          </CardTitle>
          <CardDescription>{DISCLAIMERS.SYMPTOMS}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Daily logs" value={dailyLogCount} />
            <Metric label="Periods recorded" value={periodCount} />
            <Metric label="Wellness entries" value={wellnessCount} />
          </div>

          <dl className="grid gap-3 sm:grid-cols-2">
            <Detail
              term="Passwords"
              detail="Stored only as a bcrypt hash at cost 12. The original is unrecoverable, including by us."
            />
            <Detail
              term="Recovery answers"
              detail="Normalised (trimmed, lower-cased, spaces collapsed) then hashed. Never stored or returned in plain text."
            />
            <Detail
              term="Sessions"
              detail="Opaque 256-bit tokens. Only a SHA-256 hash is stored, so the database cannot produce a working session."
            />
            <Detail
              term="IP addresses"
              detail="Never stored in readable form. Audit rows keep only a keyed digest, for counting attempts."
            />
            <Detail
              term="Administrators"
              detail="Can see anonymous totals and manage articles. They cannot open any user's health records."
            />
            <Detail
              term="Sexual health logs"
              detail="Private by default, excluded from aggregates, and never surfaced in admin reports."
            />
          </dl>
        </CardContent>
      </Card>

      {/* ---- Export ----------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="size-4 text-primary" aria-hidden="true" />
            Export your data
          </CardTitle>
          <CardDescription>
            Downloads a JSON file containing your profile, cycles, periods, daily
            logs, symptoms, moods, wellness records, private logs, fertility
            records, pregnancies, reminders, and notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="success">
            <AlertDescription>
              The export never contains your password hash, security-answer
              hashes, session tokens, recovery tokens, or any server secret. Those
              are excluded by an explicit field selection, not by a filter.
            </AlertDescription>
          </Alert>

          <Button asChild>
            {/* A plain link so the download works with no JavaScript, and so the
                browser handles the file rather than a fetch in memory. */}
            <a href="/api/export" download>
              <Download aria-hidden="true" />
              Download JSON export
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* ---- Preferences ------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-primary" aria-hidden="true" />
            Privacy preferences
          </CardTitle>
          <CardDescription>
            Both switches default to the more private option.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PrivacyPreferencesForm
            defaultValues={{
              shareAnonymousStats: profile.shareAnonymousStats,
              notificationsEnabled: profile.notificationsEnabled,
            }}
          />
        </CardContent>
      </Card>

      {/* ---- Sessions ---------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="size-4 text-primary" aria-hidden="true" />
            Active sessions
          </CardTitle>
          <CardDescription>
            Every device currently signed in to your account. Ending a session
            takes effect immediately, even if that device is still open.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SessionManager
            sessions={sessions}
            currentSessionId={currentSessionId}
          />
        </CardContent>
      </Card>

      {/* ---- Credentials ------------------------------------------------- */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-4 text-primary" aria-hidden="true" />
              Change password
            </CardTitle>
            <CardDescription>
              Signs out every device, including this one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
              Change security questions
            </CardTitle>
            <CardDescription>
              These are the only route back into a locked account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {questions.length < 3 ? (
              <p className="text-sm text-muted-foreground">
                The security-question catalogue is not seeded on this instance.
              </p>
            ) : (
              <SecurityQuestionsForm
                questions={questions}
                currentQuestionIds={answers.map((answer) => answer.questionId)}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---- Audit trail ------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="size-4 text-primary" aria-hidden="true" />
            Security activity
          </CardTitle>
          <CardDescription>
            Sensitive actions on your account. Lunara records that an action
            happened — never the content of it. No password, answer, or token is
            ever written here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {auditEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No recorded activity yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {auditEvents.map((event) => (
                <li
                  key={event.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-2.5"
                >
                  <Badge variant="outline" className="font-normal">
                    {AUDIT_EVENT_LABELS[event.event] ?? event.event}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {event.createdAt.toISOString().replace("T", " ").slice(0, 16)} UTC
                  </span>
                  {event.userAgent ? (
                    <span className="text-xs text-muted-foreground">{event.userAgent}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ---- Deletion ---------------------------------------------------- */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>Delete data or account</CardTitle>
          <CardDescription>
            Both of these are permanent. Export first if you may want the data
            later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountForm />
        </CardContent>
      </Card>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Signed in as{" "}
        <span className="font-medium text-foreground">{user.email}</span> · account
        created{" "}
        {user.onboardedAt ? formatMedium(user.onboardedAt) : "recently"} ·{" "}
        <Link href="/settings" className="text-primary underline-offset-4 hover:underline">
          settings
        </Link>
      </p>
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-muted/50 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Detail({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <dt className="text-sm font-semibold">{term}</dt>
      <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</dd>
    </div>
  );
}
