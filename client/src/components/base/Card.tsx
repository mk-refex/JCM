import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-background-200 bg-background-50 p-5 md:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface SectionCardProps {
  title?: string;
  description?: string;
  icon?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  accent?: boolean;
  compact?: boolean;
}

export function SectionCard({
  title,
  description,
  icon,
  action,
  children,
  className,
  bodyClassName,
  accent = false,
  compact = false,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-background-200 bg-background-50",
        className,
      )}
    >
      {(title || action) && (
        <header
          className={cn(
            "flex flex-col sm:flex-row sm:items-center sm:justify-between",
            compact
              ? "gap-1.5 border-b border-background-200 px-3 py-2"
              : "gap-2 border-b border-background-200 px-4 py-3",
          )}
        >
          <div className={cn("flex items-start", compact ? "gap-2" : "gap-2.5")}>
            {icon && (
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-md",
                  compact ? "h-7 w-7" : "h-8 w-8",
                  accent
                    ? "bg-accent-100 text-accent-700"
                    : "bg-primary-100 text-primary-700",
                )}
              >
                <i className={cn(icon, compact ? "text-sm" : "text-base")} />
              </span>
            )}
            <div>
              {title && (
                <h3
                  className={cn(
                    "font-heading font-semibold text-foreground-950",
                    compact ? "text-sm" : "text-sm md:text-base",
                  )}
                >
                  {title}
                </h3>
              )}
              {description && (
                <p
                  className={cn(
                    "text-foreground-600",
                    compact ? "mt-0 text-xs" : "mt-0.5 text-xs md:text-sm",
                  )}
                >
                  {description}
                </p>
              )}
            </div>
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={cn(compact ? "p-3" : "p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export default Card;