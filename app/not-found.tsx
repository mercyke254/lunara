import Link from "next/link";
import { CalendarDays, House } from "lucide-react";
import { LunaraLogo } from "@/components/brand/lunara-logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="bg-lunara-wash flex min-h-dvh flex-col items-center justify-center px-4 py-16 text-center">
      <Link href="/" aria-label="Lunara home">
        <LunaraLogo size={40} showWordmark={false} />
      </Link>

      <p className="mt-6 font-display text-5xl font-semibold tracking-tight">404</p>
      <h1 className="mt-3 font-display text-2xl font-semibold">We could not find that page</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        The link may be out of date, or the page may have moved. Your tracked
        data is unaffected.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/dashboard">
            <House aria-hidden="true" />
            Go to dashboard
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/calendar">
            <CalendarDays aria-hidden="true" />
            Open calendar
          </Link>
        </Button>
      </div>
    </div>
  );
}
