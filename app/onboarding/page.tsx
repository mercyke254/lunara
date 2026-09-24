import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/forms/onboarding-wizard";
import { requireUser } from "@/lib/auth/current-user";

export const metadata: Metadata = {
  title: "Set up your cycle",
  description: "Tell Lunara about your cycle so it can start estimating.",
};

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await requireUser("/onboarding");

  // Already finished? Nothing to do here.
  if (user.onboardedAt) redirect("/dashboard");

  return <OnboardingWizard defaultName={user.name} />;
}
