import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getCurrentUser } from "@/lib/auth/current-user";
import { safeReturnPath } from "@/lib/validation/schemas";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Lunara account.",
};

// Reads cookies and search params, so it is never prerendered.
export const dynamic = "force-dynamic";

const NOTICES: Record<string, string> = {
  reset: "Your password has been changed. Sign in with your new password.",
  passwordChanged: "Your password has been updated. Please sign in again.",
  "signedOut:all": "You have been signed out of all devices.",
  signedOut: "You have been signed out.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string; passwordChanged?: string; signedOut?: string }>;
}) {
  const params = await searchParams;

  // Already signed in? Nothing to do here.
  const user = await getCurrentUser();
  if (user) redirect(safeReturnPath(params.next));

  const next = safeReturnPath(params.next, "");
  const noticeKey = params.reset
    ? "reset"
    : params.passwordChanged
      ? "passwordChanged"
      : params.signedOut === "all"
        ? "signedOut:all"
        : params.signedOut
          ? "signedOut"
          : null;
  const notice = noticeKey ? NOTICES[noticeKey] : null;

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to see where you are in your cycle today."
      footer={
        <>
          New to Lunara?{" "}
          <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        {notice ? (
          <Alert variant="success">
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        ) : null}

        <LoginForm next={next || undefined} />

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          Protected by rate limiting. Repeated failed attempts temporarily lock
          sign-in for this account and connection.
        </p>
      </div>
    </AuthCard>
  );
}
