import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({
  icon = "ri-inbox-line",
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-background-300 bg-background-100/60 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-background-200 text-foreground-500">
        <i className={`${icon} text-2xl`} />
      </span>
      <h4 className="mt-4 font-heading text-sm font-semibold text-foreground-900">
        {title}
      </h4>
      {description && (
        <p className="mt-1 max-w-md text-xs text-foreground-600 md:text-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}