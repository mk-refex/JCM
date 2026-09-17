import { SectionCard } from "@/components/base/Card";
import { ROLE_META } from "@/constants/clarity";
import { formatDateTime } from "@/lib/utils";
import type { AuditEntry } from "@/types/domain";

const ACTION_LABEL: Record<string, string> = {
  ASSESSMENT_CREATED: "Assessment created",
  INITIAL_CLARITY_SUBMITTED: "Initial clarity submitted",
  SELF_ASSESSMENT_SAVED: "Self assessment saved",
  EMPLOYEE_SUBMITTED: "Employee submitted",
  MANAGER_ASSESSMENT_SAVED: "Manager assessment saved",
  MANAGER_SUBMITTED: "Manager submitted",
  ALIGNMENT_SELECTED: "Alignment decision",
  ALIGNMENT_STARTED: "Alignment conversation started",
  ALIGNMENT_COMPLETED: "Alignment conversation completed",
  HRBP_COMMENTED: "HRBP comment added",
  HOD_SIGNED_OFF: "HOD signed off",
  COMPLETED: "Case closed",
  REMINDER_SENT: "Reminder sent",
};

const ACTION_ICON: Record<string, string> = {
  ASSESSMENT_CREATED: "ri-add-circle-line",
  INITIAL_CLARITY_SUBMITTED: "ri-question-answer-line",
  SELF_ASSESSMENT_SAVED: "ri-save-line",
  EMPLOYEE_SUBMITTED: "ri-send-plane-line",
  MANAGER_ASSESSMENT_SAVED: "ri-save-line",
  MANAGER_SUBMITTED: "ri-user-voice-line",
  ALIGNMENT_SELECTED: "ri-check-double-line",
  ALIGNMENT_STARTED: "ri-chat-1-line",
  ALIGNMENT_COMPLETED: "ri-chat-check-line",
  HRBP_COMMENTED: "ri-chat-3-line",
  HOD_SIGNED_OFF: "ri-verified-badge-line",
  COMPLETED: "ri-flag-2-line",
  REMINDER_SENT: "ri-notification-3-line",
};

export default function AuditTimeline({ entries }: { entries: AuditEntry[] }) {
  return (
    <SectionCard
      title="Audit trail"
      description="Immutable record of every workflow action. Records cannot be edited by users."
      icon="ri-history-line"
    >
      {entries.length === 0 ? (
        <p className="rounded-md border border-dashed border-background-300 bg-background-100/60 p-4 text-sm text-foreground-500">
          No activity recorded yet.
        </p>
      ) : (
        <ol className="flex flex-col">
          {entries.map((entry, index) => (
            <li key={entry.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background-100 text-foreground-600">
                  <i
                    className={`${
                      ACTION_ICON[entry.action] ?? "ri-record-circle-line"
                    } text-base`}
                  />
                </span>
                {index < entries.length - 1 && (
                  <span className="my-1 w-px flex-1 bg-background-200" />
                )}
              </div>
              <div className="min-w-0 flex-1 pb-5">
                <p className="font-label text-sm font-semibold text-foreground-950">
                  {ACTION_LABEL[entry.action] ?? entry.action}
                </p>
                <p className="mt-0.5 text-xs text-foreground-500">
                  {entry.actorName} · {ROLE_META[entry.actorRole]?.short} ·{" "}
                  {formatDateTime(entry.createdAt)}
                </p>
                {entry.comment && (
                  <p className="mt-1.5 text-sm text-foreground-700">
                    {entry.comment}
                  </p>
                )}
                {entry.fromStatus && entry.toStatus && (
                  <p className="mt-1 font-label text-[11px] uppercase tracking-wide text-foreground-400">
                    {entry.fromStatus} → {entry.toStatus}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}