import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Crumb {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: Crumb[];
}

export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  breadcrumb,
}: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-3 border-b border-background-200 pb-4 md:flex-row md:items-end md:justify-between md:gap-4 md:pb-5">
      <div className="min-w-0">
        {eyebrow && (
          <p className="font-label text-xs font-semibold uppercase tracking-widest text-primary-600">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 font-heading text-xl font-bold text-foreground-950 md:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-3xl text-sm text-foreground-600">
            {description}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="hidden items-center gap-1.5 font-label text-xs sm:flex">
            {breadcrumb.map((crumb, index) => {
              const isLast = index === breadcrumb.length - 1;
              return (
                <span key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                  {index > 0 && (
                    <span className="text-foreground-300">/</span>
                  )}
                  {crumb.to && !isLast ? (
                    <Link
                      to={crumb.to}
                      className="cursor-pointer text-foreground-500 hover:text-primary-600"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      className={cn(
                        isLast ? "font-medium text-primary-600" : "text-foreground-500",
                      )}
                    >
                      {crumb.label}
                    </span>
                  )}
                </span>
              );
            })}
          </nav>
        )}
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}