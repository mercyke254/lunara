import type { Metadata } from "next";
import Link from "next/link";
import { Bell, KeyRound, Palette, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { ProfileForm } from "@/components/forms/profile-form";
import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { SecurityQuestionsForm } from "@/components/forms/security-questions-form";
import { requireUser, getProfileSummary } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Settings",
  description: "Cycle defaults, appearance, password, and account security.",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();

  const [profile, questions, answers] = await Promise.all([
    getProfileSummary(user.id),
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
  ]);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Everything that changes how Lunara behaves for you. Security changes require your password."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ---- Cycle defaults ------------------------------------------- */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-primary" aria-hidden="true" />
              Profile and cycle defaults
            </CardTitle>
            <CardDescription>
              These values are used until you have logged enough cycles for Lunara
              to measure them from your own data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              defaultValues={{
                name: user.name,
                averageCycleLength: profile.averageCycleLength,
                averagePeriodLength: profile.averagePeriodLength,
                cycleRegularity: profile.cycleRegularity,
              }}
            />
          </CardContent>
        </Card>

        {/* ---- Appearance ----------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="size-4 text-primary" aria-hidden="true" />
              Appearance
            </CardTitle>
            <CardDescription>
              Light, dark, or follow your device. The choice is stored on this
              device, not on your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeToggle />
          </CardContent>
        </Card>

        {/* ---- Notifications shortcut ----------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-4 text-primary" aria-hidden="true" />
              Reminders and notifications
            </CardTitle>
            <CardDescription>
              Each reminder type has its own switch, so you can keep appointment
              reminders while turning off daily nudges.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/reminders">
                <Bell aria-hidden="true" />
                Manage reminders
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* ---- Password ------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-4 text-primary" aria-hidden="true" />
              Password
            </CardTitle>
            <CardDescription>
              Changing your password signs out every device, including this one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>

        {/* ---- Security questions --------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
              Account recovery questions
            </CardTitle>
            <CardDescription>
              These are the only way to regain access if you forget your password,
              so keep the answers memorable.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {questions.length < 3 ? (
              <p className="text-sm text-muted-foreground">
                The security-question catalogue has not been seeded on this
                instance. Run the seed script and reload.
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

      <Card>
        <CardHeader>
          <CardTitle>Data and privacy</CardTitle>
          <CardDescription>
            Export your data, review active sessions, or delete your account.
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
