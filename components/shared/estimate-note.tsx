import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Estimate labelling.
 *
 * Medical-safety requirement: any date the app derives from cycle arithmetic must
 * be visibly marked as an estimate, never presented as a measurement or a fact.
 * These two components are the only sanctioned ways to render a prediction, so
 * the labelling cannot be forgotten on a new screen.
 */

/** Inline badge for a predicted value ("Estimated", "Estimated ±3 days"). */
export function EstimateBadge({
  uncertaintyDays,
  className,
}: {
  uncertaintyDays?: number;
  className?: string;
}) {
  const label =
    typeof uncertaintyDays === "number" && uncertaintyDays > 0
      ? `Estimate ±${uncertaintyDays} ${uncertaintyDays === 1 ? "day" : "days"}`
      : "Estimate";

  return (
    <Badge variant="outline" className={cn("font-normal", className)}>
      {label}
    </Badge>
  );
}

/**
 * Explanatory note that accompanies a prediction.
 *
 * `tone="fertility"` additionally carries the contraception warning, which is
 * mandatory anywhere a fertile window or ovulation date is shown.
 */
export function EstimateNote({
  text,
  tone = "default",
  className,
}: {
  text: string;
  tone?: "default" | "fertility";
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 text-xs leading-relaxed text-muted-foreground",
        className,
      )}
    >
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>
        {text}
        {tone === "fertility" ? (
          <>
            {" "}
            <strong className="font-semibold text-foreground">
              This is not a contraceptive method.
            </strong>
          </>
        ) : null}
      </span>
    </p>
  );
}
