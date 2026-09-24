import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { LunaraLogo } from "@/components/brand/lunara-logo";
import { ThemeToggleCompact } from "@/components/brand/theme-toggle";
import { UserMenu } from "@/components/navigation/user-menu";
import { Badge } from "@/components/ui/badge";

/**
 * Sticky application header.
 *
 * A Server Component: it reads no client state, so the interactive pieces
 * (theme toggle, account menu) are the only client components in the tree.
 */
export function AppHeader({
  name,
  email,
  unreadNotifications = 0,
}: {
  name: string;
  email: string;
  unreadNotifications?: number;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        {/* The sidebar owns the logo from md: up, so it is hidden here. */}
        <Link href="/dashboard" className="md:hidden" aria-label="Lunara dashboard">
          <LunaraLogo size={30} showWordmark={false} />
        </Link>

        <Link
          href="/search"
          className="group flex h-10 flex-1 items-center gap-2.5 rounded-full border border-border bg-card px-4 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground sm:max-w-md"
        >
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">Search articles, symptoms, your logs…</span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/reminders#notifications"
            aria-label={
              unreadNotifications > 0
                ? `Notifications, ${unreadNotifications} unread`
                : "Notifications"
            }
            className="relative flex size-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
          >
            <Bell className="size-4" aria-hidden="true" />
            {unreadNotifications > 0 ? (
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 min-w-5 justify-center px-1 py-0 text-[10px] leading-4"
              >
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </Badge>
            ) : null}
          </Link>

          <ThemeToggleCompact />

          <UserMenu name={name} email={email} />
        </div>
      </div>
    </header>
  );
}
