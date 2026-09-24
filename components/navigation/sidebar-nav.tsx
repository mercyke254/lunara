"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAV_SECTIONS, isNavItemActive } from "@/components/navigation/nav-items";
import { LunaraLogo } from "@/components/brand/lunara-logo";
import { cn } from "@/lib/utils";

/**
 * Desktop sidebar navigation.
 *
 * Rendered as a fixed column from `md:` up. Each destination shows a short
 * description so a new user can orient without clicking around.
 */
export function SidebarNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-card/60 md:flex md:flex-col">
      <div className="flex h-16 items-center px-5">
        <Link
          href="/dashboard"
          className="rounded-xl focus-visible:outline-none"
          aria-label="Lunara dashboard"
        >
          <LunaraLogo size={32} />
        </Link>
      </div>

      <nav
        aria-label="Sections"
        className="flex-1 space-y-6 overflow-y-auto px-3 pb-6 pt-2"
      >
        {APP_NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isNavItemActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      title={item.description}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none",
                        active
                          ? "bg-primary-soft text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon
                        className="size-4.5 shrink-0"
                        strokeWidth={active ? 2.4 : 2}
                        aria-hidden="true"
                      />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {isAdmin ? (
          <div>
            <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Administration
            </p>
            <ul className="space-y-0.5">
              <li>
                <Link
                  href="/admin"
                  aria-current={pathname.startsWith("/admin") ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none",
                    pathname.startsWith("/admin")
                      ? "bg-primary-soft text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span className="size-4.5 shrink-0 rounded-md border border-current" aria-hidden="true" />
                  Admin
                </Link>
              </li>
            </ul>
          </div>
        ) : null}
      </nav>

      <p className="border-t border-border px-5 py-4 text-[11px] leading-relaxed text-muted-foreground">
        Lunara supports your tracking. It does not diagnose conditions.
      </p>
    </aside>
  );
}
