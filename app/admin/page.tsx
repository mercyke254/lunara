import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  FileText,
  FolderOpen,
  Bell,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db/prisma";
import { addDays, formatMedium, today } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Overview",
};

export const dynamic = "force-dynamic";

/**
 * Admin overview.
 *
 * WHAT IS SHOWN: counts of accounts, activity volume, and content status.
 *
 * WHAT IS DELIBERATELY ABSENT: symptom distributions, mood distributions, cycle
 * lengths, or any per-user metric. Those would be anonymous in isolation, but
 * showing them to operators normalises reading users' health data, and at small
 * user counts an "aggregate" quickly becomes identifying. Content management and
 * operational health are the jobs of this screen; user health is not.
 */
export default async function AdminOverviewPage() {
  const sevenDaysAgo = addDays(today(), -7);
  const thirtyDaysAgo = addDays(today(), -30);

  const [
    totalUsers,
    onboardedUsers,
    activeLastWeek,
    totalDailyLogs,
    logsLast30,
    totalPeriods,
    totalWellness,
    remindersConfigured,
    articleCounts,
    categoryCount,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, onboardedAt: { not: null } } }),
    prisma.user.count({
      where: { deletedAt: null, lastLoginAt: { gte: sevenDaysAgo } },
    }),
    prisma.dailyLog.count(),
    prisma.dailyLog.count({ where: { date: { gte: thirtyDaysAgo } } }),
    prisma.period.count(),
    prisma.wellnessLog.count(),
    prisma.reminder.count({ where: { enabled: true } }),
    prisma.article.groupBy({
      by: ["published"],
      _count: { _all: true },
    }),
    prisma.articleCategory.count(),
  ]);

  const published = articleCounts.find((row) => row.published)?._count._all ?? 0;
  const drafts = articleCounts.find((row) => !row.published)?._count._all ?? 0;

  const recentUsers = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 5,
    // Note the projection: name is shown for operational contact, but no health
    // data and no credential field is selected.
    select: { id: true, name: true, createdAt: true, onboardedAt: true, role: true },
  });

  return (
    <>
      <PageHeader
        title="Overview"
        description="Operational health of this Lunara instance. Counts only — no user health data is read to produce this page."
      />

      {/* ---- Account metrics -------------------------------------------- */}
      <section aria-labelledby="accounts-heading" className="space-y-3">
        <h2
          id="accounts-heading"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Accounts
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Accounts"
            icon={<Users aria-hidden="true" />}
            value={totalUsers}
            hint="Excludes deleted accounts"
          />
          <StatCard
            label="Onboarded"
            icon={<TrendingUp aria-hidden="true" />}
            tone="success"
            value={onboardedUsers}
            hint={
              totalUsers > 0
                ? `${Math.round((onboardedUsers / totalUsers) * 100)}% of accounts`
                : "No accounts yet"
            }
          />
          <StatCard
            label="Active (7 days)"
            icon={<Users aria-hidden="true" />}
            tone="blue"
            value={activeLastWeek}
            hint="Signed in this week"
          />
          <StatCard
            label="Active reminders"
            icon={<Bell aria-hidden="true" />}
            tone="rose"
            value={remindersConfigured}
            hint="Across all accounts"
          />
        </div>
      </section>

      {/* ---- Activity volume -------------------------------------------- */}
      <section aria-labelledby="activity-heading" className="space-y-3">
        <h2
          id="activity-heading"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Activity volume
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Daily logs"
            icon={<FileText aria-hidden="true" />}
            value={totalDailyLogs}
            hint="All time, all accounts"
          />
          <StatCard
            label="Logs (30 days)"
            icon={<FileText aria-hidden="true" />}
            tone="blue"
            value={logsLast30}
            hint="Recent engagement"
          />
          <StatCard
            label="Periods recorded"
            icon={<BookOpen aria-hidden="true" />}
            tone="rose"
            value={totalPeriods}
            hint="Count only — no cycle data read"
          />
          <StatCard
            label="Wellness entries"
            icon={<TrendingUp aria-hidden="true" />}
            tone="success"
            value={totalWellness}
            hint="Count only"
          />
        </div>
      </section>

      {/* ---- Content ----------------------------------------------------- */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="size-4 text-primary" aria-hidden="true" />
              Content
            </CardTitle>
            <CardDescription>
              The education hub is the only user-facing data administrators own.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Published</p>
                <p className="mt-0.5 font-display text-xl font-semibold tabular-nums">
                  {published}
                </p>
              </div>
              <div className="rounded-2xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Drafts</p>
                <p className="mt-0.5 font-display text-xl font-semibold tabular-nums">
                  {drafts}
                </p>
              </div>
              <div className="rounded-2xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Categories</p>
                <p className="mt-0.5 font-display text-xl font-semibold tabular-nums">
                  {categoryCount}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href="/admin/articles/new">
                  <FileText aria-hidden="true" />
                  New article
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/articles">
                  <FileText aria-hidden="true" />
                  Manage articles
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/categories">
                  <FolderOpen aria-hidden="true" />
                  Categories
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Newest accounts</CardTitle>
            <CardDescription>
              Name and sign-up state only. No health data is selected by this
              query.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No accounts yet.</p>
            ) : (
              <ul className="space-y-2">
                {recentUsers.map((account) => (
                  <li
                    key={account.id}
                    className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-muted/40 px-3.5 py-2.5"
                  >
                    <span className="text-sm font-medium">{account.name}</span>
                    {account.role === "ADMIN" ? (
                      <Badge variant="outline" className="font-normal">
                        Admin
                      </Badge>
                    ) : null}
                    <Badge
                      variant={account.onboardedAt ? "success" : "warning"}
                      className="font-normal"
                    >
                      {account.onboardedAt ? "Onboarded" : "Pending setup"}
                    </Badge>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatMedium(account.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Why there is no per-user data here</CardTitle>
          <CardDescription>
            Lunara is a health product, so the administrative boundary is drawn
            deliberately narrowly. Aggregate health statistics are omitted even
            though they would be anonymous on paper: with a small user base an
            &quot;aggregate&quot; can describe an individual, and building the
            capability to read users&apos; symptoms creates a standing risk that
            does not need to exist. If instance-level health reporting is ever
            required, it should be an explicit, consented, opt-in data donation —
            not a default operator capability.
          </CardDescription>
        </CardHeader>
      </Card>
    </>
  );
}
