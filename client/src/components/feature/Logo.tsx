import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  invert?: boolean;
  collapsed?: boolean;
}

export default function Logo({ className, invert = false, collapsed = false }: LogoProps) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-md",
          invert ? "bg-background-50" : "bg-background-100",
        )}
      >
        <img
          src="https://static.readdy.ai/image/d0ead66ce635a168f1e83b108be94826/62ea5dacd066d6c3bd8887e47db0c643.png"
          alt="Refex logo"
          className="h-5 w-auto object-contain"
        />
      </span>
      <span
        className={cn(
          "flex flex-col leading-none transition-opacity duration-200",
          collapsed ? "pointer-events-none w-0 overflow-hidden opacity-0" : "opacity-100",
        )}
      >
        <span
          className={cn(
            "font-heading text-sm font-semibold tracking-tight",
            invert ? "text-background-50" : "text-foreground-950",
          )}
        >
          Job Clarity
        </span>
        <span
          className={cn(
            "font-label text-[11px] tracking-wide",
            invert ? "text-background-200" : "text-foreground-500",
          )}
        >
          Refex Group · HR
        </span>
      </span>
    </span>
  );
}