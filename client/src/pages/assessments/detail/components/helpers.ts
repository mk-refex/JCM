import { GAP_TONE_LABEL } from "@/pages/assessments/detail/components/constants";

export {
  derivedEmployeeAverage,
  derivedGap,
  derivedManagerAverage,
  derivedRag,
  effectiveAgeing,
  effectiveSla,
  scoreLabel,
} from "@/lib/metrics";

export { gapTone } from "@/lib/rag";

export { progressPercent as progressLabel } from "@/lib/workflow";

export function gapDescription(gap: number | null): string {
  if (gap === null) return "Not available yet";
  const abs = Math.abs(gap);
  if (abs <= 1) return GAP_TONE_LABEL.LOW;
  if (abs === 2) return GAP_TONE_LABEL.MEDIUM;
  return GAP_TONE_LABEL.HIGH;
}