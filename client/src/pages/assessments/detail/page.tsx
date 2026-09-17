import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { SectionCard } from "@/components/base/Card";
import Button from "@/components/base/Button";
import EmptyState from "@/components/base/EmptyState";
import CaseHeader from "@/pages/assessments/detail/components/CaseHeader";
import CaseOverview from "@/pages/assessments/detail/components/CaseOverview";
import ScoreComparison from "@/pages/assessments/detail/components/ScoreComparison";
import CommentsPanel from "@/pages/assessments/detail/components/CommentsPanel";
import AuditTimeline from "@/pages/assessments/detail/components/AuditTimeline";
import HodSignoffForm from "@/pages/assessments/detail/components/HodSignoffForm";
import AlignmentConversationForm from "@/pages/assessments/detail/components/AlignmentConversationForm";
import { useApp } from "@/store/AppContext";
import { useToast } from "@/store/ToastContext";
import {
  applyResponseIsolation,
  canAccessAssessment,
  canViewEmployeeResponses,
  isConversationStage,
  isHodActorOf,
  isHrbpActorOf,
  managerHasSubmitted,
} from "@/services/assessmentService";
import { WORKFLOW_STATUS_META } from "@/constants/clarity";
import type { WorkflowResult } from "@/services/workflowService";

export default function AssessmentDetail() {
  const { id } = useParams();
  const { assessmentById, currentUser, employeeById, auditForAssessment, loadAudit, submitHodSignoff, submitAlignmentConversation } =
    useApp();
  const { pushToast } = useToast();

  const record = assessmentById(id);
  const [signingOff, setSigningOff] = useState(false);
  const [savingConversation, setSavingConversation] = useState(false);

  useEffect(() => {
    if (id) void loadAudit(id).catch(() => undefined);
  }, [id, loadAudit]);

  if (!record) {
    return (
      <EmptyState
        icon="ri-file-unknow-line"
        title="Assessment not found"
        description="This assessment may have been removed or the link is incorrect."
        action={
          <Link to="/app/assessments">
            <Button variant="primary" icon="ri-arrow-left-line">
              Back to assessments
            </Button>
          </Link>
        }
      />
    );
  }

  if (!canAccessAssessment(currentUser, record)) {
    return (
      <EmptyState
        icon="ri-lock-line"
        title="You do not have permission to access this assessment"
        description="Role based access control is enforced for every record. If you believe this is incorrect, please contact your HR Business Partner."
        action={
          <Link to="/app/dashboard">
            <Button variant="outline" icon="ri-arrow-left-line">
              Return to dashboard
            </Button>
          </Link>
        }
      />
    );
  }

  const assessment = applyResponseIsolation(currentUser, record);
  const showResponses = canViewEmployeeResponses(currentUser, record);
  const employee = employeeById(record.employeeId);
  const submitted = managerHasSubmitted(record);
  const meta = WORKFLOW_STATUS_META[record.status];
  const canSignOff =
    isHodActorOf(currentUser, record) &&
    (record.status === "HOD_SIGNOFF_PENDING" ||
      record.status === "ROLE_ALIGNMENT_COMPLETED") &&
    !record.hodSignoff;
  const canEditHodConversation = isHodActorOf(currentUser, record);
  const canEditHrbpConversation = isHrbpActorOf(currentUser, record);
  const showConversationForm =
    isConversationStage(record.status) &&
    (canEditHodConversation || canEditHrbpConversation);

  const toastResult = (
    result: WorkflowResult | null | Promise<WorkflowResult | null>,
  ) => {
    void Promise.resolve(result)
      .then((value) => {
        if (!value) return;
        pushToast({
          tone: value.toastTone,
          title: value.toastTitle,
          message: value.toastMessage,
        });
      })
      .catch((error: unknown) => {
        pushToast({
          tone: "error",
          title: "Could not save",
          message: error instanceof Error ? error.message : "Please try again.",
        });
      });
  };

  const handleHodSignoff = (comments: string) => {
    setSigningOff(true);
    toastResult(
      submitHodSignoff(record, comments).finally(() => setSigningOff(false)),
    );
  };

  const handleConversation = (input: {
    hodComments?: string;
    hrbpComments?: string;
    complete?: boolean;
  }) => {
    setSavingConversation(true);
    toastResult(
      submitAlignmentConversation(record, input).finally(() =>
        setSavingConversation(false),
      ),
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <CaseHeader assessment={record} employee={employee} />

      <div className="flex items-start gap-3 rounded-lg border border-secondary-200 bg-secondary-50 p-4">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          <i className="ri-arrow-right-circle-line text-base text-secondary-700" />
        </span>
        <div>
          <p className="font-label text-sm font-semibold text-foreground-900">
            Current stage · {meta.label}
          </p>
          <p className="mt-0.5 text-sm text-foreground-700">{meta.description}</p>
          <p className="mt-1 text-xs text-foreground-500">
            Action owner: {meta.stageOwner}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          <CaseOverview
            assessment={assessment}
            employee={employee}
            showResponses={showResponses}
          />
          <ScoreComparison assessment={assessment} />
          <CommentsPanel
            assessment={assessment}
            showEmployeeComments={showResponses}
            showManagerComments={submitted}
          />
          {showConversationForm && (
            <AlignmentConversationForm
              assessment={record}
              employeeName={employee?.name ?? "the employee"}
              canEditHod={canEditHodConversation}
              canEditHrbp={canEditHrbpConversation}
              submitting={savingConversation}
              onSave={handleConversation}
            />
          )}
          {canSignOff && (
            <HodSignoffForm
              employeeName={employee?.name ?? "the employee"}
              submitting={signingOff}
              onSubmit={handleHodSignoff}
            />
          )}
        </div>

        <div className="flex flex-col gap-6">
          <SectionCard
            title="Case governance"
            description="Ownership, SLA and closure safeguards."
            icon="ri-shield-check-line"
          >
            <ul className="flex flex-col gap-3.5 text-sm">
              <li className="flex items-start gap-2.5">
                <i className="ri-checkbox-circle-line mt-0.5 text-base text-primary-600" />
                <span className="text-foreground-700">
                  Role based access enforced per record.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <i className="ri-checkbox-circle-line mt-0.5 text-base text-primary-600" />
                <span className="text-foreground-700">
                  Manager ratings stay hidden until the manager submits.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <i className="ri-checkbox-circle-line mt-0.5 text-base text-primary-600" />
                <span className="text-foreground-700">
                  Gap, averages and RAG are calculated automatically.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <i className="ri-checkbox-circle-line mt-0.5 text-base text-primary-600" />
                <span className="text-foreground-700">
                  HOD sign-off is terminal — closed cases cannot reopen.
                </span>
              </li>
            </ul>
          </SectionCard>

          <AuditTimeline entries={auditForAssessment(record.id)} />
        </div>
      </div>
    </div>
  );
}