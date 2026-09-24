"use client";

import Link from "next/link";
import {
  Bell,
  ChartLine,
  LogOut,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { logoutAction } from "@/lib/actions/auth-actions";
import { initials } from "@/lib/utils";

const MENU_LINKS = [
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/insights", label: "Insights", icon: ChartLine },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/privacy", label: "Privacy centre", icon: ShieldCheck },
] as const;

export function UserMenu({ name, email }: { name: string; email: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
        aria-label="Open account menu"
      >
        <Avatar className="size-9 border border-border">
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="normal-case">
          <span className="block truncate text-sm font-semibold text-foreground">{name}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">
            {email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {MENU_LINKS.map(({ href, label, icon: Icon }) => (
          <DropdownMenuItem key={href} asChild>
            <Link href={href}>
              <Icon aria-hidden="true" />
              {label}
            </Link>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <form action={logoutAction}>
          <DropdownMenuItem variant="destructive" asChild>
            <button type="submit" className="w-full">
              <LogOut aria-hidden="true" />
              Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
