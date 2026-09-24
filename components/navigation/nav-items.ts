import {
  Baby,
  Bell,
  BookOpen,
  CalendarDays,
  ChartLine,
  Droplets,
  Egg,
  House,
  Plus,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";

/**
 * Navigation model, shared by the desktop sidebar and (a subset) the mobile
 * bottom bar. Plain data plus icon components - the icons are resolved here so
 * both navigation shells render identically.
 */

export type NavIcon = React.ComponentType<React.SVGProps<SVGSVGElement>>;

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  /** Short description used by the sidebar's accessible labels. */
  description?: string;
  /** Render with the elevated, primary treatment (mobile centre action). */
  emphasis?: boolean;
  /** Only shown to administrators. */
  adminOnly?: boolean;
}

/** The five destinations in the mobile bottom bar. */
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/log", label: "Log", icon: Plus, emphasis: true },
  { href: "/insights", label: "Insights", icon: ChartLine },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export interface NavSection {
  title: string;
  items: NavItem[];
}

/** Full navigation for the desktop sidebar. */
export const APP_NAV_SECTIONS: NavSection[] = [
  {
    title: "Track",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: House, description: "Today at a glance" },
      { href: "/calendar", label: "Calendar", icon: CalendarDays, description: "Periods and predictions" },
      { href: "/log", label: "Daily log", icon: Plus, description: "Symptoms, mood, body" },
      { href: "/wellness", label: "Wellness", icon: Droplets, description: "Sleep, water, movement" },
      { href: "/fertility", label: "Fertility", icon: Egg, description: "Estimated fertile window" },
      { href: "/pregnancy", label: "Pregnancy", icon: Baby, description: "Week-by-week timeline" },
    ],
  },
  {
    title: "Understand",
    items: [
      { href: "/insights", label: "Insights", icon: ChartLine, description: "Patterns and trends" },
      { href: "/education", label: "Learn", icon: BookOpen, description: "Trusted health articles" },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/reminders", label: "Reminders", icon: Bell, description: "Notifications you control" },
      { href: "/profile", label: "Profile", icon: UserRound, description: "Your details" },
      { href: "/settings", label: "Settings", icon: Settings, description: "Cycle and display" },
      { href: "/privacy", label: "Privacy", icon: ShieldCheck, description: "Your data, your control" },
    ],
  },
];

/**
 * Is a nav item active for the current path?
 * Exact match for the root-level destinations, prefix match for their children
 * (e.g. /education/menstrual-cycle keeps "Learn" highlighted).
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}
