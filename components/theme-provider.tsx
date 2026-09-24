"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Dark-mode host.
 *
 * `attribute="class"` toggles `.dark` on <html>, which is what the
 * `@custom-variant dark` rule in globals.css keys off.
 *
 * `disableTransitionOnChange` matters more than it looks: without it, every
 * colour-bearing element animates during a theme flip, producing a slow,
 * smeary switch. `suppressHydrationWarning` on <html> (set in the root layout)
 * is required because the class is applied before React hydrates.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
