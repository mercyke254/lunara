import Link from "next/link";
import { LunaraLogo } from "@/components/brand/lunara-logo";
import { cn } from "@/lib/utils";

/**
 * Shared frame for every authentication screen.
 *
 * Keeping the logo, heading rhythm, and card treatment in one place is what
 * makes the sign-in, registration, and recovery flows feel like one product
 * rather than five separate forms.
 */
export function AuthCard({
  title,
  description,
  children,
  footer,
  className,
  wide = false,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div className={cn("w-full", wide ? "max-w-2xl" : "max-w-md", className)}>
      <div className="rounded-3xl border border-border bg-card p-6 shadow-lift sm:p-8">
        <Link
          href="/"
          className="inline-flex rounded-xl focus-visible:outline-none"
          aria-label="Lunara home"
        >
          <LunaraLogo size={38} />
        </Link>

        <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </div>
        ) : null}

        <div className="mt-6">{children}</div>
      </div>

      {footer ? (
        <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>
      ) : null}
    </div>
  );
}
