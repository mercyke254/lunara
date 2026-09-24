import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DISCLAIMERS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type DisclaimerKind = keyof typeof DISCLAIMERS;

const TITLES: Record<DisclaimerKind, string> = {
  ESTIMATE: "These are estimates",
  FERTILITY: "About fertility predictions",
  PREGNANCY: "About due dates and medical care",
  SYMPTOMS: "Tracking, not diagnosis",
  SEEK_CARE: "When to seek care",
};

/**
 * Standard medical disclaimer.
 *
 * Centralised so the required wording is identical everywhere it appears, and so
 * a new screen cannot invent its own softer version. `medical` renders as a calm
 * lavender panel rather than a red alert - these are standing notices, not
 * errors, and should not train users to dismiss warnings.
 */
export function DisclaimerNote({
  kind,
  className,
  compact = false,
}: {
  kind: DisclaimerKind;
  className?: string;
  compact?: boolean;
}) {
  return (
    <Alert variant="medical" className={cn(compact && "py-3", className)}>
      {compact ? null : <AlertTitle>{TITLES[kind]}</AlertTitle>}
      <AlertDescription className="text-muted-foreground">
        {DISCLAIMERS[kind]}
      </AlertDescription>
    </Alert>
  );
}
