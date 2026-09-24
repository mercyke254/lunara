"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BOTTOM_NAV_ITEMS, isNavItemActive } from "@/components/navigation/nav-items";
import { cn } from "@/lib/utils";

/**
 * Mobile bottom navigation.
 *
 * Design notes:
 *  - hidden from `md:` up, where the sidebar takes over
 *  - honours the iOS safe-area inset so it is not overlapped by the home bar
 *  - the middle "Log" action is rendered as an elevated circular button, which
 *    is the fastest path to the most frequent action in the app
 *  - `aria-current="page"` marks the active destination for screen readers
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/85 backdrop-blur-lg md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-lg items-end justify-around px-1.5 pb-1.5 pt-2">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          const Icon = item.icon;

          if (item.emphasis) {
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  aria-label={item.label}
                  className="group flex flex-col items-center gap-1 focus-visible:outline-none"
                >
                  <span
                    className={cn(
                      "-mt-6 flex size-13 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lift transition-transform duration-200 group-active:scale-95",
                      active && "ring-4 ring-primary/20",
                    )}
                  >
                    <Icon className="size-6" strokeWidth={2.5} aria-hidden="true" />
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-medium leading-none",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          }

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl px-1 py-1.5 transition-colors focus-visible:outline-none",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon
                  className="size-5"
                  strokeWidth={active ? 2.4 : 1.9}
                  aria-hidden="true"
                />
                <span className="text-[11px] font-medium leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
