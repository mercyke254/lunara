import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { Toaster } from "@/components/ui/sonner";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/lib/constants";
import "./globals.css";

/**
 * Typography.
 *
 * Inter for UI (excellent at small sizes, tabular figures for metrics) and
 * Fraunces for display headings - a soft, high-contrast serif that reads as
 * premium and feminine without tipping into decorative.
 *
 * Both are fetched at build time and self-hosted by Next, so there is no
 * runtime request to Google and no layout shift from a late font swap.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: `${APP_NAME} — ${APP_TAGLINE}`,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon.svg" }],
  },
  // Health tracking is private by default: keep it out of search indexes.
  robots: {
    index: true,
    follow: true,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Deliberately NOT setting maximumScale/user-scalable: blocking pinch-zoom is
  // an accessibility failure (WCAG 1.4.4).
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#131120" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: next-themes writes the theme class onto <html>
    // before React hydrates, which is an intentional server/client difference.
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${fraunces.variable} antialiased`}>
        <ThemeProvider>
          {/* Skip link: the first focusable element, for keyboard users. */}
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
          >
            Skip to content
          </a>
          {children}
          <Toaster />
          {/* Registers the offline shell in production builds only. */}
          <ServiceWorkerRegistration />
        </ThemeProvider>
      </body>
    </html>
  );
}
