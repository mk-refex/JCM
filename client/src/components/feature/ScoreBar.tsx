import { cn } from "@/lib/utils";

interface ScoreBarProps {
  value: number | null;
  max?: number;
  tone?: "primary" | "accent" | "secondary";
  showValue?: boolean;
}

const FILL: Record<string, string> = {
  primary: "bg-primary-500",
  accent: "bg-accent-500",
  secondary: "bg-secondary-500",
};

export default function ScoreBar({
  value,
  max = 5,
  tone = "primary",
  showValue = true,
}: ScoreBarProps) {
  const pct = value === null ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-background-200">
        <div
          className={cn("h-full rounded-full transition-all duration-500", FILL[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showValue && (
        <span className="w-9 shrink-0 text-right font-label text-xs font-semibold text-foreground-700">
          {value === null ? "—" : value.toFixed(1)}
        </span>
      )}
    </div>
  );
}