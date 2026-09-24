import type { Metadata } from "next";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { getRecoverySessionState } from "@/lib/auth/recovery/recovery-flow";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Set a new password for your Lunara account.",
};

export const dynamic = "force-dynamic";

/**
 * Step 4-5 of recovery.
 *
 * The page is only reachable when the recovery session has been VERIFIED
 * (`verifiedAt` is set on the database row). Loading this URL directly, with an
 * unverified session or a decoy cookie, shows an error instead of a form — so
 * the reset step cannot be reached by skipping the security questions.
 */
export default async function ResetPasswordPage() {
  const state = await getRecoverySessionState();

  if (state !== "verified") {
    return (
      <AuthCard
        title="Choose a new password"
        description="This step needs a verified recovery session."
      >
        <EmptyState
          icon={<LockKeyhole />}
          title="Verification required"
          description={
            state === "expired"
              ? "Your recovery session expired before the questions were verified. Nothing has changed on your account."
              : "Answer your security questions before setting a new password."
          }
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild>
                <Link href="/forgot-password">Start recovery</Link>
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
      title="Choose a new password"
      description="Your security answers were verified. Set a new password to finish."
      footer={
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
