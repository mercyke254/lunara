import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ThemeToggleCompact } from "@/components/brand/theme-toggle";
import { APP_NAME, DISCLAIMERS } from "@/lib/constants";

/**
 * Layout for every unauthenticated account screen.
 *
 * A single centred column with the soft brand wash behind it. The reassurance
 * line at the bottom is not decoration: it is the medical-scope statement, and
 * it appears here because this is where users first hand over health context.
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="bg-lunara-wash flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </Link>
        <ThemeToggleCompact />
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 sm:px-6 sm:pt-8">
        {children}
      </main>

      <footer className="px-4 pb-8 sm:px-6">
        <p className="mx-auto max-w-md text-center text-xs leading-relaxed text-muted-foreground">
          {APP_NAME} tracks what you record and calculates estimates from it.
          {" "}
          {DISCLAIMERS.SYMPTOMS}
        </p>
      </footer>
    </div>
  );
}
