import { SectionCard } from "@/components/base/Card";
import { Badge } from "@/components/base/Badge";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { Assessment } from "@/types/domain";

interface CommentsPanelProps {
  assessment: Assessment;
  showEmployeeComments: boolean;
  showManagerComments: boolean;
}

const CONVERSATION_LABEL: Record<string, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};

export default function CommentsPanel({
  assessment,
  showEmployeeComments,
  showManagerComments,
}: CommentsPanelProps) {
  const conversation = assessment.alignmentConversation;

  return (
    <div className="flex flex-col gap-6">
      <SectionCard
        title="Section D — Comments"
        description="Clarifications requested by the employee, the manager's coaching notes and the agreed role expectations."
        icon="ri-chat-3-line"
      >
        <div className="flex flex-col gap-5">
          <div>
            <p className="font-label text-[11px] uppercase tracking-wide text-foreground-500">
              Employee comments
            </p>
            {showEmployeeComments ? (
              <p className="mt-1.5 text-sm text-foreground-800">
                {assessment.employeeComments || "No comments provided."}
              </p>
            ) : (
              <p className="mt-1.5 text-sm text-foreground-500">
                Hidden until the manager assessment is submitted.
              </p>
            )}
          </div>

          <div className="border-t border-background-200 pt-5">
            <p className="font-label text-[11px] uppercase tracking-wide text-foreground-500">
              Manager comments / coaching notes
            </p>
            {showManagerComments ? (
              <p className="mt-1.5 text-sm text-foreground-800">
                {assessment.managerComments || "No comments provided."}
              </p>
            ) : (
              <p className="mt-1.5 text-sm text-foreground-500">
                Awaiting the manager assessment.
              </p>
            )}
          </div>

          <div className="border-t border-background-200 pt-5">
            <p className="font-label text-[11px] uppercase tracking-wide text-foreground-500">
              Role expectations / clarifications
            </p>
            {showManagerComments ? (
              <p className="mt-1.5 text-sm text-foreground-800">
                {assessment.roleExpectations || "No expectations recorded."}
              </p>
            ) : (
              <p className="mt-1.5 text-sm text-foreground-500">
                Awaiting the manager assessment.
              </p>
            )}
          </div>
        </div>
      </SectionCard>

      {conversation &&
        conversation.status === "COMPLETED" && (
        <SectionCard
          title="Role alignment conversation"
          description="Constructive role clarification involving the Employee, Reporting Manager, HOD and HRBP."
          icon="ri-group-line"
          accent
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                tone={
                  conversation.status === "COMPLETED"
                    ? "success"
                    : conversation.status === "IN_PROGRESS"
                      ? "warning"
                      : "progress"
                }
                dot
              >
                {CONVERSATION_LABEL[conversation.status]}
              </Badge>
              <span className="text-xs text-foreground-500">
                Scheduled {formatDate(conversation.scheduledDate)}
              </span>
              <span className="text-xs text-foreground-500">
                Updated {formatDateTime(conversation.updatedAt)}
              </span>
            </div>

            <div>
              <p className="font-label text-[11px] uppercase tracking-wide text-foreground-500">
                HOD final comments / clarifications
              </p>
              <p className="mt-1.5 text-sm text-foreground-800">
                {conversation.hodComments || assessment.hodComments || "Not recorded yet."}
              </p>
            </div>

            <div>
              <p className="font-label text-[11px] uppercase tracking-wide text-foreground-500">
                HRBP comments / observations
              </p>
              <p className="mt-1.5 text-sm text-foreground-800">
                {conversation.hrbpComments || assessment.hrbpComments || "Not recorded yet."}
              </p>
            </div>
          </div>
        </SectionCard>
      )}

      {assessment.hodSignoff && (
        <SectionCard
          title="HOD final sign-off"
          description="Terminal approval for this case."
          icon="ri-verified-badge-line"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="font-label text-[11px] uppercase tracking-wide text-foreground-500">
                Signed off by
              </p>
              <p className="mt-1 text-sm font-medium text-foreground-900">
                {assessment.hodSignoff.hodName}
              </p>
            </div>
            <div>
              <p className="font-label text-[11px] uppercase tracking-wide text-foreground-500">
                Date and time
              </p>
              <p className="mt-1 text-sm font-medium text-foreground-900">
                {formatDateTime(assessment.hodSignoff.signedAt)}
              </p>
            </div>
            <div>
              <p className="font-label text-[11px] uppercase tracking-wide text-foreground-500">
                Status
              </p>
              <p className="mt-1">
                <Badge tone="success" dot>
                  Signed off
                </Badge>
              </p>
            </div>
            <div>
              <p className="font-label text-[11px] uppercase tracking-wide text-foreground-500">
                Case completed
              </p>
              <p className="mt-1 text-sm font-medium text-foreground-900">
                {formatDate(assessment.completedAt)}
              </p>
            </div>
          </div>
          {assessment.hodSignoff.comments && (
            <p className="mt-4 border-t border-background-200 pt-4 text-sm text-foreground-700">
              {assessment.hodSignoff.comments}
            </p>
          )}
        </SectionCard>
      )}
    </div>
  );
}