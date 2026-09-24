import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { EmptyState } from "@/components/shared/empty-state";
import { ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Create a Lunara account to start tracking your cycle.",
};

// Queries the security-question catalogue, so it must be dynamic.
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  // Only active questions are offered. Ordered for a stable, predictable list.
  const questions = await prisma.securityQuestion.findMany({
    where: { active: true },
    orderBy: { question: "asc" },
    select: { id: true, question: true },
  });

  // Registration cannot complete without the catalogue, so fail honestly rather
  // than rendering a form that cannot be submitted.
  if (questions.length < 3) {
    return (
      <AuthCard title="Create your account" wide>
        <EmptyState
          icon={<ShieldAlert />}
          title="Setup is incomplete"
          description="The security-question catalogue has not been seeded on this instance. Run `npm run db:seed` against the database, then reload this page."
          action={
            <Link href="/" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              Back to home
            </Link>
          }
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      wide
      title="Create your account"
      description="A few details and three recovery questions. That is everything Lunara needs to start."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm questions={questions} />
    </AuthCard>
  );
}
