import { redirect } from "next/navigation";
import { AppHeader } from "@/components/navigation/app-header";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { SidebarNav } from "@/components/navigation/sidebar-nav";
import { requireUser } from "@/lib/auth/current-user";
import { getUnreadNotificationCount } from "@/lib/queries/tracking";

/**
 * Shell for every authenticated screen.
 *
 * This layout is the real authorisation boundary for the app routes: it resolves
 * the session against the database and redirects unauthenticated visitors. It
 * also enforces onboarding completion, so no tracking screen ever has to cope
 * with a profile that has no cycle settings.
 *
 * The whole subtree is dynamically rendered because it depends on cookies().
 */
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();

  // Send new accounts through the wizard before they reach any tracking screen.
  if (!user.onboardedAt) redirect("/onboarding");

  const unreadNotifications = await getUnreadNotificationCount(user.id);

  return (
    <div className="flex min-h-dvh bg-background">
      <SidebarNav isAdmin={user.role === "ADMIN"} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          name={user.name}
          email={user.email}
          unreadNotifications={unreadNotifications}
        />

        {/* pb-24 clears the fixed bottom navigation on mobile. */}
        <main id="main" className="flex-1 px-4 pb-24 pt-5 sm:px-6 md:pb-10">
          <div className="mx-auto w-full max-w-5xl space-y-6">{children}</div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
