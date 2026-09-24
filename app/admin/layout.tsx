import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FolderOpen, LayoutDashboard, FileText } from "lucide-react";
import { LunaraLogo } from "@/components/brand/lunara-logo";
import { ThemeToggleCompact } from "@/components/brand/theme-toggle";
import { UserMenu } from "@/components/navigation/user-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth/current-user";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: {
    default: "Administration",
    template: "%s · Lunara admin",
  },
  // Keep the admin area out of search indexes entirely.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Admin area shell.
 *
 * `requireAdmin()` redirects non-administrators to their dashboard before
 * anything renders. Every mutation in this area re-checks the role server-side,
 * so this layout is convenience rather than the security boundary.
 *
 * The scope notice is shown on every admin screen, not just once: an
 * administrator should never be uncertain about whether they can see user health
 * data. They cannot.
 */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireAdmin();

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/admin" className="rounded-xl focus-visible:outline-none" aria-label="Lunara administration">
            <LunaraLogo size={32} />
          </Link>

          <Badge variant="outline" className="hidden gap-1.5 sm:inline-flex">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Administration
          </Badge>

          <nav aria-label="Admin sections" className="ml-4 hidden items-center gap-1 md:flex">
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin">
                <LayoutDashboard aria-hidden="true" />
                Overview
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/articles">
                <FileText aria-hidden="true" />
                Articles
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/categories">
                <FolderOpen aria-hidden="true" />
                Categories
              </Link>
            </Button>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">
                <ArrowLeft aria-hidden="true" />
                <span className="hidden sm:inline">Back to app</span>
              </Link>
            </Button>
            <ThemeToggleCompact />
            <UserMenu name={user.name} email={user.email} />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <Alert variant="info">
          <ShieldCheck aria-hidden="true" />
          <AlertDescription>
            <strong className="font-semibold text-foreground">Scope of access.</strong>{" "}
            Administrators manage educational content and see anonymous,
            aggregate counts. There is no screen anywhere in Lunara that lets an
            administrator open a user&apos;s cycles, logs, symptoms, moods,
            wellness entries, or private records — those queries are scoped to
            the signed-in owner only.
          </AlertDescription>
        </Alert>

        {children}
      </main>
    </div>
  );
}
