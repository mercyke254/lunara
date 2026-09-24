import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Labelled form field wrapper.
 *
 * Wires up the accessibility plumbing that is easy to forget: the label points
 * at the control, errors are announced via `role="alert"`, and the error text is
 * linked with `aria-describedby` so it is read together with the input.
 */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const errorId = error ? `${htmlFor}-error` : undefined;
  const hintId = hint ? `${htmlFor}-hint` : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
        {required ? <span className="sr-only">(required)</span> : null}
      </Label>

      {children}

      {hint ? (
        <p id={hintId} className="text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Described-by string for a control, combining whichever of hint/error exist.
 * Pass the result to the input's `aria-describedby`.
 */
export function describedBy(
  htmlFor: string,
  opts: { error?: string; hint?: boolean },
): string | undefined {
  const ids: string[] = [];
  if (opts.hint) ids.push(`${htmlFor}-hint`);
  if (opts.error) ids.push(`${htmlFor}-error`);
  return ids.length > 0 ? ids.join(" ") : undefined;
}
