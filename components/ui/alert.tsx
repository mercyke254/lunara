import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, CheckCircle2, Info, ShieldAlert, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Inline alert.
 *
 * `role` is set per variant: errors and warnings are assertive enough to be
 * announced (`alert`), while neutral information uses `status` so it does not
 * interrupt a screen reader mid-sentence.
 */
const alertVariants = cva(
  "relative flex w-full gap-3 rounded-2xl border px-4 py-3.5 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-border bg-muted/60 text-foreground",
        info: "border-[color-mix(in_oklab,var(--accent-blue)_35%,transparent)] bg-[color-mix(in_oklab,var(--accent-blue)_12%,transparent)] text-foreground",
        success:
          "border-[color-mix(in_oklab,var(--success)_35%,transparent)] bg-[color-mix(in_oklab,var(--success)_10%,transparent)] text-foreground",
        warning:
          "border-[color-mix(in_oklab,var(--warning)_40%,transparent)] bg-[color-mix(in_oklab,var(--warning)_12%,transparent)] text-foreground",
        destructive: "border-destructive/35 bg-destructive/8 text-foreground",
        /** Used for medical disclaimers - prominent but calm. */
        medical:
          "border-primary/25 bg-primary-soft/70 text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

const ICONS = {
  default: Info,
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  destructive: AlertCircle,
  medical: ShieldAlert,
} as const;

function Alert({
  className,
  variant = "default",
  icon,
  children,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof alertVariants> & {
    /** Override the default icon; pass `null` to render no icon. */
    icon?: React.ReactNode;
  }) {
  const key = (variant ?? "default") as keyof typeof ICONS;
  const Icon = ICONS[key];

  return (
    <div
      data-slot="alert"
      role={variant === "destructive" || variant === "warning" ? "alert" : "status"}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {icon === null ? null : (icon ?? <Icon aria-hidden="true" />)}
      <div className="flex-1 space-y-1 leading-relaxed">{children}</div>
    </div>
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="alert-title" className={cn("font-semibold", className)} {...props} />;
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-sm leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, alertVariants };
