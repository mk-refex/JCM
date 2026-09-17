import { cn, initials } from "@/lib/utils";

const PALETTE = [
  "bg-primary-100 text-primary-800",
  "bg-accent-100 text-accent-800",
  "bg-secondary-200 text-secondary-900",
  "bg-primary-200 text-primary-900",
  "bg-accent-200 text-accent-900",
];

function paletteFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash + name.charCodeAt(i)) % 997;
  }
  return PALETTE[hash % PALETTE.length];
}

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

export default function Avatar({ name, size = "md", className }: AvatarProps) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-label font-semibold",
        SIZE[size],
        paletteFor(name),
        className,
      )}
      title={name}
    >
      {initials(name)}
    </span>
  );
}