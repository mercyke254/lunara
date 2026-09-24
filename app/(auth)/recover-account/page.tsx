import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldQuestion } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { RecoveryForm } from "@/components/auth/recovery-form";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { getRecoveryChallenge } from "@/lib/auth/recovery/recovery-flow";

export const metadata: Metadata = {
  title: "Security questions",
  description: "Answer your security question to reset your password.",
};

export const dynamic = "force-dynamic";

/**
 * Step 3 of recovery.
 *
 * Everything this page needs comes from the httpOnly recovery cookie, resolved
 * server-side. No email address, token, or answer ever appears in the URL - so
 * there is nothing to leak through history, logs, or a shared link.
 *
 * For an email with no account, `getRecoveryChallenge` returns a decoy question
 * set and this page renders identically. Verification will then fail with the
 * same generic message a wrong answer produces.
 */
export default async function RecoverAccountPage() {
  const challenge = await getRecoveryChallenge();

  // Already verified: skip straight to choosing a password.
  if (challenge.state === "verified") redirect("/reset-password");

  if (challenge.state === "expired") {
    return (
      <AuthCard title="Recovery session expired" description="For your security, recovery sessions last 20 minutes.">
        <EmptyState
          icon={<ShieldQuestion />}
          title="Start again"
          description="This recovery session has expired or was locked after too many attempts. Nothing has changed on your account."
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild>
                <Link href="/forgot-password">Start recovery again</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/login">Back to sign in</Link>
              </Button>
            </div>
          }
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      wide
      title="Answer your security question"
      description="This is the question you chose when you created your account."
      footer={
        <>
          Need to start over?{" "}
          <Link href="/forgot-password" className="font-medium text-primary underline-offset-4 hover:underline">
            Use a different email
          </Link>
        </>
      }
    >
      <RecoveryForm questions={challenge.questions} />
    </AuthCard>
  );
}
