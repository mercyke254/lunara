import type { Metadata } from "next";
import Link from "next/link";
import { CloudOff, RefreshCw } from "lucide-react";
import { LunaraLogo } from "@/components/brand/lunara-logo";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Offline",
  description: "Lunara needs a connection to load your tracking data.",
};

/**
 * Offline fallback, precached by the service worker.
 *
 * The page is deliberately static and contains no personal data — the service
 * worker never caches authenticated HTML, so there is nothing here to leak. It
 * explains the limitation rather than pretending the app is available offline.
 */
export default function OfflinePage() {
  return (
    <div className="bg-lunara-wash flex min-h-dvh flex-col items-center justify-center px-4 py-16 text-center">
      <Link href="/" aria-label={`${APP_NAME} home`}>
        <LunaraLogo size={40} showWordmark={false} />
      </Link>

      <div className="mt-6 flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <CloudOff className="size-6" aria-hidden="true" />
      </div>

      <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        You are offline
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        Lunara needs a connection to load your cycle and log data. Everything you
        have already saved is safe on the server — nothing has been lost.
      </p>

      <Alert variant="info" className="mt-8 max-w-md text-left">
        <AlertDescription>
          Your health data is deliberately not cached on this device for offline
          use. Keeping it off local storage means a shared or stolen device cannot
          expose it.
        </AlertDescription>
      </Alert>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/dashboard">
            <RefreshCw aria-hidden="true" />
            Try again
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/education">Read an article instead</Link>
        </Button>
      </div>
    </div>
  );
}
