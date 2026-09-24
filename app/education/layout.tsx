import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, House } from "lucide-react";
import { LunaraLogo } from "@/components/brand/lunara-logo";
import { ThemeToggleCompact } from "@/components/brand/theme-toggle";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { DISCLAIMERS } from "@/lib/constants";

export const metadata: Metadata = {
  title: {
    default: "Education hub",
    template: "%s · Lunara",
  },
  description:
    "Plain-language articles on the menstrual cycle, PMS, fertility, pregnancy, nutrition, sleep, and sexual health.",
};

export const dynamic = "force-dynamic";

/**
 * Layout for the education hub.
 *
 * This area is PUBLIC — it is linked from the marketing page and should be
 * readable before signing up. It therefore has its own lightweight header rather
 * than the authenticated app shell.
 *
 * The header adapts: signed-in readers get a link back to their dashboard,
 * anonymous readers get a sign-in call to action. Either way the content itself
 * is identical.
 */
export default async function EducationLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Link
            href={user ? "/dashboard" : "/"}
            className="rounded-xl focus-visible:outline-none"
            aria-label={user ? "Back to Lunara" : "Lunara home"}
          >
            <LunaraLogo size={32} />
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggleCompact />
            {user ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard">
                  <House aria-hidden="true" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/register">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>

      <footer className="border-t border-border bg-card/50">
        <div className="mx-auto max-w-5xl space-y-3 px-4 py-8 sm:px-6">
          <Link
            href={user ? "/dashboard" : "/"}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {user ? "Back to your dashboard" : "Back to the home page"}
          </Link>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {DISCLAIMERS.SYMPTOMS} {DISCLAIMERS.SEEK_CARE}
          </p>
        </div>
      </footer>
    </div>
  );
}
