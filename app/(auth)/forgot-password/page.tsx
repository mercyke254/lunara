import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Account recovery",
  description: "Reset your Lunara password using your security questions.",
};

export const dynamic = "force-dynamic";

/**
 * Step 1-2 of recovery.
 *
 * The help text states plainly what the next step involves. It deliberately does
 * not mention whether an email provider is configured: the answer is the same
 * either way from the user's perspective, and revealing it would be noise.
 */
export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Forgot your password?"
      description="Enter your email address and we will take you to your recovery question."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
