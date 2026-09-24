import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Button.
 *
 * Fully-rounded for a soft, premium feel. The default height is 44px to meet the
 * recommended minimum touch target on mobile.
 *
 * Written in the React 19 idiom: `ref` is a normal prop on function components,
 * so `forwardRef` is not needed.
 */

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-soft hover:bg-primary-hover hover:shadow-lift active:scale-[0.98]",
        soft: "bg-primary-soft text-primary hover:bg-primary/15 active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/70 active:scale-[0.98]",
        outline:
          "border border-input bg-background text-foreground hover:bg-muted hover:border-primary/40 active:scale-[0.98]",
        ghost: "text-foreground hover:bg-muted active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-soft hover:bg-destructive/90 active:scale-[0.98]",
        destructiveOutline:
          "border border-destructive/40 text-destructive hover:bg-destructive/10 active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-4 text-sm [&_svg]:size-4",
        default: "h-11 px-5 text-sm [&_svg]:size-4",
        lg: "h-12 px-7 text-base [&_svg]:size-5",
        icon: "size-11 [&_svg]:size-5",
        iconSm: "size-9 [&_svg]:size-4",
      },
      block: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  /** Render as the child element (e.g. a Next.js `<Link>`). */
  asChild?: boolean;
  /** Show a spinner and disable interaction. */
  loading?: boolean;
}

function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  // `asChild` renders a single child, which cannot also hold a spinner icon.
  const content = asChild ? (
    children
  ) : (
    <>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </>
  );

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, block, className }))}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {content}
    </Comp>
  );
}

export { Button, buttonVariants };
