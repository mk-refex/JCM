import { RATING_SCALE } from "@/constants/clarity";
import { cn } from "@/lib/utils";

interface ScoreChipProps {
  score: number | null;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export function ScoreChip({
  score,
  size = "md",
  showLabel = false,
}: ScoreChipProps) {
  if (score === null || score === undefined) {
    return (
      <span className="inline-flex items-center rounded-md border border-dashed border-background-300 px-2 py-1 font-label text-xs text-foreground-400">
        Not rated
      </span>
    );
  }
  const label = RATING_SCALE.find((r) => r.score === score)?.label ?? "";
  const tone =
    score >= 4
      ? "bg-secondary-100 text-secondary-800 border-secondary-200"
      : score === 3
        ? "bg-accent-100 text-accent-800 border-accent-200"
        : "bg-primary-100 text-primary-700 border-primary-200";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-label font-semibold",
        tone,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
      )}
      title={label}
    >
      {score}
      {showLabel && (
        <span className="font-normal opacity-80">· {label}</span>
      )}
    </span>
  );
}

export function GapChip({ gap }: { gap: number | null }) {
  if (gap === null || gap === undefined) {
    return (
      <span className="inline-flex items-center rounded-md border border-dashed border-background-300 px-2 py-1 font-label text-xs text-foreground-400">
        —
      </span>
    );
  }
  const abs = Math.abs(gap);
  const tone =
    abs <= 1
      ? "bg-secondary-100 text-secondary-800 border-secondary-200"
      : abs === 2
        ? "bg-accent-100 text-accent-800 border-accent-200"
        : "bg-primary-600 text-white border-primary-700";
  const sign = gap > 0 ? "+" : "";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-1 font-label text-sm font-semibold",
        tone,
      )}
    >
      {sign}
      {gap}
    </span>
  );
}

export default ScoreChip;