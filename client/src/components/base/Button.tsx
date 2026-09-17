import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "accent"
  | "outline"
  | "ghost"
  | "subtle"
  | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-500 text-white hover:bg-primary-600 dark:text-foreground-950",
  accent: "bg-accent-500 text-white hover:bg-accent-600",
  outline:
    "border border-background-300 bg-background-50 text-foreground-800 hover:bg-background-100 hover:border-background-400",
  ghost: "text-foreground-700 hover:bg-background-100",
  subtle:
    "bg-secondary-100 text-secondary-900 hover:bg-secondary-200 border border-secondary-200",
  danger: "bg-accent-900 text-background-50 hover:bg-accent-950",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-sm gap-2",
  icon: "h-9 w-9 text-sm",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconRight?: string;
  loading?: boolean;
  children?: ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-lg font-label font-medium transition-colors duration-200",
        "focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-1 focus-visible:ring-offset-background-50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <i className="ri-loader-4-line animate-spin text-base" />
      ) : (
        icon && (
          <span className="flex h-4 w-4 items-center justify-center">
            <i className={cn(icon, "text-base")} />
          </span>
        )
      )}
      {children}
      {iconRight && (
        <span className="flex h-4 w-4 items-center justify-center">
          <i className={cn(iconRight, "text-base")} />
        </span>
      )}
    </button>
  );
}