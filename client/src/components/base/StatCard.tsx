import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { BadgeTone } from "@/components/base/Badge";

interface Tint {
  card: string;
  chip: string;
  value: string;
  watermark: string;
}

const TINTS: Record<BadgeTone, Tint> = {
  neutral: {
    card: "border-background-200 bg-background-50",
    chip: "bg-background-100 text-foreground-600",
    value: "text-foreground-900",
    watermark: "text-foreground-900",
  },
  progress: {
    card: "border-primary-200 bg-primary-50",
    chip: "bg-primary-100 text-primary-600",
    value: "text-primary-600",
    watermark: "text-primary-500",
  },
  success: {
    card: "border-secondary-200 bg-secondary-50",
    chip: "bg-secondary-100 text-secondary-700",
    value: "text-secondary-700",
    watermark: "text-secondary-600",
  },
  warning: {
    card: "border-accent-200 bg-accent-50",
    chip: "bg-accent-100 text-accent-700",
    value: "text-accent-700",
    watermark: "text-accent-600",
  },
  accent: {
    card: "border-primary-200 bg-primary-50",
    chip: "bg-primary-100 text-primary-600",
    value: "text-primary-600",
    watermark: "text-primary-500",
  },
  danger: {
    card: "border-primary-300 bg-primary-100",
    chip: "bg-primary-200 text-primary-700",
    value: "text-primary-700",
    watermark: "text-primary-600",
  },
};

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: string;
  tone?: BadgeTone;
  className?: string;
  to?: string;
}

export default function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  className,
  to,
}: StatCardProps) {
  const tint = TINTS[tone];
  const classes = cn(
    "relative overflow-hidden rounded-lg border px-3 py-2.5",
    tint.card,
    to && "block cursor-pointer transition-colors hover:border-primary-300 hover:shadow-sm",
    className,
  );

  const body = (
    <>
      {icon && (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute -bottom-3 -right-2 hidden items-center justify-center opacity-[0.07] lg:flex",
            tint.watermark,
          )}
        >
          <i className={cn(icon, "text-5xl leading-none")} />
        </span>
      )}

      <div className="relative flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {icon && (
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                tint.chip,
              )}
            >
              <i className={cn(icon, "text-sm")} />
            </span>
          )}
          <div className="min-w-0">
            <p className="font-label text-xs font-semibold leading-snug text-foreground-800">
              {label}
            </p>
            {hint && (
              <p className="mt-0.5 text-[11px] leading-tight text-foreground-600">
                {hint}
              </p>
            )}
          </div>
        </div>
        <p
          className={cn(
            "shrink-0 font-heading text-xl font-bold leading-none tracking-tight",
            tint.value,
          )}
        >
          {value}
        </p>
      </div>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes}>
        {body}
      </Link>
    );
  }

  return <div className={classes}>{body}</div>;
}