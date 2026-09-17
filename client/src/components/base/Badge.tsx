import type { ReactNode } from "react";
import type {
  AlignmentStatus,
  RagStatus,
  SlaStatus,
  WorkflowStatus,
} from "@/types/domain";
import {
  RAG_META,
  WORKFLOW_STATUS_META,
  type StatusMeta,
} from "@/constants/clarity";
import { cn } from "@/lib/utils";

export type BadgeTone =
  | "neutral"
  | "progress"
  | "success"
  | "warning"
  | "danger"
  | "accent";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral:
    "bg-background-100 text-foreground-700 border-background-300",
  progress: "bg-primary-50 text-primary-700 border-primary-200",
  success: "bg-secondary-100 text-secondary-800 border-secondary-200",
  warning: "bg-accent-100 text-accent-800 border-accent-200",
  danger: "bg-primary-600 text-white border-primary-700",
  accent: "bg-accent-200 text-accent-900 border-accent-300",
};

const DOT_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-foreground-400",
  progress: "bg-primary-500",
  success: "bg-secondary-500",
  warning: "bg-accent-500",
  danger: "bg-background-50",
  accent: "bg-accent-700",
};

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  icon?: string;
  dot?: boolean;
  className?: string;
}

export function Badge({
  tone = "neutral",
  children,
  icon,
  dot = false,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 font-label text-xs font-medium",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {dot && (
        <span className={cn("h-1.5 w-1.5 rounded-full", DOT_CLASSES[tone])} />
      )}
      {icon && (
        <span className="flex h-3.5 w-3.5 items-center justify-center">
          <i className={cn(icon, "text-sm")} />
        </span>
      )}
      {children}
    </span>
  );
}

export function StatusBadge({
  status,
  showIcon = false,
}: {
  status: WorkflowStatus;
  showIcon?: boolean;
}) {
  const meta: StatusMeta = WORKFLOW_STATUS_META[status];
  return (
    <Badge tone={meta.tone} dot={!showIcon}>
      {meta.label}
    </Badge>
  );
}

export function RagBadge({ rag }: { rag: RagStatus | null }) {
  if (!rag) {
    return <Badge tone="neutral">Not calculated</Badge>;
  }
  const tone: BadgeTone =
    rag === "GREEN" ? "success" : rag === "AMBER" ? "warning" : "danger";
  return (
    <Badge tone={tone} dot>
      {RAG_META[rag].label}
    </Badge>
  );
}

const SLA_LABEL: Record<SlaStatus, string> = {
  ON_TRACK: "On track",
  DUE_SOON: "Due soon",
  BREACHED: "Breached",
  COMPLETED: "Completed",
};

const SLA_TONE: Record<SlaStatus, BadgeTone> = {
  ON_TRACK: "progress",
  DUE_SOON: "warning",
  BREACHED: "danger",
  COMPLETED: "success",
};

export function SlaBadge({ status }: { status: SlaStatus }) {
  return (
    <Badge tone={SLA_TONE[status]} dot>
      SLA · {SLA_LABEL[status]}
    </Badge>
  );
}

export function AlignmentBadge({
  status,
}: {
  status: AlignmentStatus | null;
}) {
  if (!status || status === "PENDING") {
    return <Badge tone="neutral">Alignment pending</Badge>;
  }
  return (
    <Badge tone={status === "ALIGNED" ? "success" : "danger"} dot>
      {status === "ALIGNED" ? "Aligned" : "Not aligned"}
    </Badge>
  );
}

export default Badge;