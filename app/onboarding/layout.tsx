import { requireUser } from "@/lib/auth/current-user";
import { LunaraLogo } from "@/components/brand/lunara-logo";
import { ThemeToggleCompact } from "@/components/brand/theme-toggle";

/**
 * Layout for the onboarding wizard.
 *
 * Deliberately outside the `(app)` group: the wizard has no sidebar or bottom
 * navigation, because a half-configured account has nowhere useful to navigate
 * to yet.
 *
 * This is also the one authenticated screen that must NOT require
 * `onboardedAt` - it is where that gets set.
 */
export const dynamic = "force-dynamic";

export default async function OnboardingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Guards the route without redirecting onward, avoiding a redirect loop.
  await requireUser("/onboarding");

  return (
    <div className="bg-lunara-wash flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <LunaraLogo size={32} />
        <ThemeToggleCompact />
      </header>

      <main id="main" className="flex flex-1 justify-center px-4 pb-16 pt-2 sm:px-6 sm:pt-6">
        <div className="w-full max-w-xl">{children}</div>
      </main>
    </div>
  );
}
