import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  EyeOff,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { requireUser, getProfileSummary, getCyclePrediction } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { formatMedium } from "@/lib/dates";
import { initials } from "@/lib/utils";
import { REGULARITY_OPTIONS, TRACKING_GOAL_OPTIONS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your account, cycle settings, and tracking goals.",
};

export const dynamic = "force-dynamic";

/**
 * Profile overview.
 *
 * Read-mostly: it summarises who you are and what you are tracking, then links
 * into Settings for edits. Splitting "see" from "change" keeps the profile
 * scannable and puts all the write surfaces behind one consistent screen.
 */
export default async function ProfilePage() {
  const user = await requireUser();
  const [profile, { prediction }, securityAnswerCount] = await Promise.all([
    getProfileSummary(user.id),
    getCyclePrediction(user.id),
    prisma.userSecurityAnswer.count({ where: { userId: user.id } }),
  ]);

  const goalLabels = profile.trackingGoals
    .map(
      (goal) =>
        TRACKING_GOAL_OPTIONS.find((option) => option.value === goal)?.label as
          | string
          | undefined,
    )
    .filter((label): label is string => label !== undefined);

  const regularityLabel =
    REGULARITY_OPTIONS.find((option) => option.value === prediction.regularity)?.label ??
    "Not established";

  return (
    <>
      <PageHeader
        title="Profile"
        description="Your account details and the cycle settings Lunara uses when it has no logged history to measure from."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/settings">
              <SlidersHorizontal aria-hidden="true" />
              Edit settings
            </Link>
          </Button>
        }
      />

      {/* ---- Identity ----------------------------------------------------- */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar className="size-14 border border-border">
              <AvatarFallback className="text-lg">{initials(user.name)}</AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <p className="font-display text-xl font-semibold">{user.name}</p>
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {user.role === "ADMIN" ? (
                  <Badge variant="outline" className="font-normal">
                    Administrator
                  </Badge>
                ) : null}
                <Badge variant="success" className="font-normal">
                  <ShieldCheck className="mr-1 size-3" aria-hidden="true" />
                  {securityAnswerCount} recovery questions set
                </Badge>
                {user.onboardedAt ? (
                  <Badge variant="secondary" className="font-normal">
                    Onboarded {formatMedium(user.onboardedAt)}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---- Cycle summary ------------------------------------------------ */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your cycle</CardTitle>
            <CardDescription>
              Measured from your logs where possible; otherwise the values below
              are used.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Average cycle" value={`${prediction.averageCycleLength} days`} />
            <Row label="Average period" value={`${prediction.averagePeriodLength} days`} />
            <Row label="Regularity" value={regularityLabel} />
            <Row
              label="Cycles measured"
              value={
                prediction.basedOnCycles === 0
                  ? "None yet"
                  : `${prediction.basedOnCycles}`
              }
            />
            <Row
              label="Last period start"
              value={profile.lastPeriodStart ? formatMedium(profile.lastPeriodStart) : "Not recorded"}
            />
            <Row label="Age range" value={profile.ageRange ?? "Not provided"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What you are tracking for</CardTitle>
            <CardDescription>
              Chosen during onboarding. Lunara uses these to decide which insights
              to surface first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {goalLabels.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No goals selected yet. You can add them in settings.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {goalLabels.map((label) => (
                  <li key={label}>
                    <Badge variant="secondary" className="font-normal">
                      <Sparkles className="mr-1 size-3" aria-hidden="true" />
                      {label}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}

            <Separator className="my-4" />

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Quick links
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/settings">
                    <SlidersHorizontal aria-hidden="true" />
                    Cycle settings
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/reminders">
                    <Bell aria-hidden="true" />
                    Reminders
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/privacy">
                    <EyeOff aria-hidden="true" />
                    Privacy centre
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your data belongs to you</CardTitle>
          <CardDescription>
            Export everything you have logged as JSON, review your active
            sessions, or delete your account entirely from the privacy centre.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="soft">
            <Link href="/privacy">
              <ShieldCheck aria-hidden="true" />
              Open privacy centre
            </Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
