import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type NoticeTone = "info" | "success" | "warning" | "danger";

interface StatusNoticeProps {
  icon: string;
  title: string;
  message: string;
  tone?: NoticeTone;
  bullets?: string[];
  actions?: ReactNode;
}

const TONE_CLASSES: Record<NoticeTone, string> = {
  info: "border-secondary-200 bg-secondary-50",
  success: "border-primary-200 bg-primary-50",
  warning: "border-accent-200 bg-accent-50",
  danger: "border-accent-300 bg-accent-50",
};

const ICON_CLASSES: Record<NoticeTone, string> = {
  info: "bg-secondary-100 text-secondary-800",
  success: "bg-primary-100 text-primary-800",
  warning: "bg-accent-100 text-accent-800",
  danger: "bg-accent-200 text-accent-900",
};

export default function StatusNotice({
  icon,
  title,
  message,
  tone = "info",
  bullets,
  actions,
}: StatusNoticeProps) {
  return (
    <section
      className={cn("rounded-lg border p-5 md:p-6", TONE_CLASSES[tone])}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
            ICON_CLASSES[tone],
          )}
        >
          <i className={cn(icon, "text-xl")} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-base font-semibold text-foreground-950">
            {title}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground-700">
            {message}
          </p>
          {bullets && bullets.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {bullets.map((line) => (
                <li key={line} className="flex items-start gap-2 text-sm text-foreground-700">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                    <i className="ri-checkbox-circle-line text-base text-primary-600" />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          )}
          {actions && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {actions}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}