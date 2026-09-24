import { cn } from "@/lib/utils";

/**
 * Empty state.
 *
 * Always answers three questions: what is missing, why, and what to do next.
 * An `action` is strongly encouraged for the primary empty states (no logs yet,
 * no cycle data) because an empty screen with no next step is a dead end.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border bg-muted/40 px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary [&_svg]:size-6">
          {icon}
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="font-display text-lg font-semibold">{title}</p>
        {description ? (
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
