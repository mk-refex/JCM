import { Link, Navigate, useParams } from "react-router-dom";
import PageHeader from "@/components/base/PageHeader";
import Button from "@/components/base/Button";
import EmptyState from "@/components/base/EmptyState";
import CaseHeader from "@/pages/assessments/detail/components/CaseHeader";
import InitialCheck from "@/pages/review/components/InitialCheck";
import SelfAssessmentForm from "@/pages/review/components/SelfAssessmentForm";
import ManagerAssessmentForm from "@/pages/review/components/ManagerAssessmentForm";
import AlignmentCheck from "@/pages/review/components/AlignmentCheck";
import StatusNotice from "@/pages/review/components/StatusNotice";
import { useApp } from "@/store/AppContext";
import { useToast } from "@/store/ToastContext";
import { canAccessAssessment } from "@/services/assessmentService";
import { currentStepIndex, STEPPER_STEPS } from "@/lib/workflow";
import {
  CLOSURE_MESSAGE,
  CLOSURE_MESSAGE_NO_CONVERSATION,
  NOT_ALIGNED_MESSAGE,
  YES_CLARITY_MESSAGE,
} from "@/constants/clarity";
import type { WorkflowResult } from "@/services/workflowService";

export default function ReviewPage() {
  const { id } = useParams();
  const {
    assessmentById,
    currentUser,
    employeeById,
    submitInitialClarity,
    saveSelfAssessmentDraft,
    submitSelfAssessment,
    saveManagerAssessmentDraft,
    submitManagerAssessment,
    submitAlignmentDecision,
  } = useApp();
  const { pushToast } = useToast();

  const record = assessmentById(id);

  if (!record) {
    return (
      <EmptyState
        icon="ri-file-unknow-line"
        title="Review not found"
        description="This role clarity review may have been removed or the link is incorrect."
        action={
          <Link to="/app/dashboard">
            <Button variant="primary" icon="ri-arrow-left-line">
              Back to dashboard
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
        title="You do not have permission to access this review"
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

  // The relationship to the case decides the experience, not the login role.
  // Someone who is the SUBJECT of the review (even if they are a manager, HOD
  // or HRBP) uses the full employee form workflow; someone who is the reporting
  // MANAGER uses the independent manager form. Anyone else uses the case file.
  const myEmployeeId = currentUser?.employeeId ?? null;
  const isSubject =
    Boolean(myEmployeeId) && record.employeeId === myEmployeeId;
  const isManagerActor =
    Boolean(myEmployeeId) && record.managerId === myEmployeeId;

  if (!isSubject && !isManagerActor) {
    return <Navigate to={`/app/assessments/${record.id}`} replace />;
  }

  if (
    isManagerActor &&
    !isSubject &&
    record.status !== "MANAGER_ASSESSMENT_PENDING"
  ) {
    return <Navigate to={`/app/assessments/${record.id}`} replace />;
  }

  const employee = employeeById(record.employeeId);
  const managerName = employeeById(record.managerId)?.name;
  const employeeName = employee?.name ?? "the employee";

  const toastResult = (
    result: WorkflowResult | null | Promise<WorkflowResult | null>,
  ) =>
    Promise.resolve(result)
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

  const caseLink = (
    <Link to={`/app/assessments/${record.id}`}>
      <Button variant="outline" icon="ri-file-text-line">
        View full case file
      </Button>
    </Link>
  );

  // The reporting manager submits an independent assessment while the case is
  // awaiting their rating. It is presented as a focused screen with only the
  // form fields, mirroring the employee self assessment experience.
  if (isManagerActor) {
    const stepLabel = STEPPER_STEPS[currentStepIndex(record.status)];
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
        <div className="flex flex-col">
          <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-primary-600">
            {stepLabel.label} · Step {currentStepIndex(record.status) + 1} of{" "}
            {STEPPER_STEPS.length}
          </p>
          <h1 className="mt-0.5 font-heading text-lg font-semibold text-foreground-950 sm:text-xl">
            Independent Manager Assessment
          </h1>
          <p className="mt-0.5 max-w-2xl text-xs text-foreground-600 sm:text-sm">
            Rate {employeeName}&apos;s role clarity independently across the 7
            dimensions, then record the role expectations for the employee to
            review. Save as draft at any time; submit once all checks pass.
          </p>
        </div>

        <ManagerAssessmentForm
          assessment={record}
          employee={employee}
          managerName={managerName}
          onSaveDraft={(input) =>
            toastResult(saveManagerAssessmentDraft(record, input))
          }
          onSubmit={(input) =>
            toastResult(submitManagerAssessment(record, input))
          }
        />
      </div>
    );
  }

  const renderStage = () => {
    switch (record.status) {
      case "DRAFT":
      case "INITIAL_CLARITY_CHECK":
        return null;

      case "SELF_ASSESSMENT_PENDING":
        return (
          <SelfAssessmentForm
            assessment={record}
            employee={employee}
            managerName={managerName}
            onSaveDraft={(input) =>
              toastResult(saveSelfAssessmentDraft(record, input))
            }
            onSubmit={(input) =>
              toastResult(submitSelfAssessment(record, input))
            }
          />
        );

      case "MANAGER_ASSESSMENT_PENDING":
        return (
          <StatusNotice
            icon="ri-hourglass-line"
            title="Awaiting your reporting manager"
            message={`Your self assessment has been submitted to ${managerName ?? "your reporting manager"}. They will complete an independent assessment before any comparison is shared with you.`}
            tone="info"
            bullets={[
              "Your manager cannot see your ratings or comments until after they submit.",
              "You will be notified the moment the manager assessment is completed.",
              "This stage carries a 3 working day SLA.",
            ]}
            actions={caseLink}
          />
        );

      case "MANAGER_ASSESSMENT_COMPLETED":
      case "EMPLOYEE_ALIGNMENT_PENDING":
        return (
          <AlignmentCheck
            assessment={record}
            onDecide={(decision) =>
              toastResult(submitAlignmentDecision(record, decision))
            }
          />
        );

      case "ALIGNED":
      case "HOD_SIGNOFF_PENDING":
        return (
          <StatusNotice
            icon="ri-verified-badge-line"
            title="Role Alignment Confirmed"
            message="You have confirmed that the role expectations and clarifications provided by your Reporting Manager are aligned with your understanding. The assessment has now been routed to the HOD for final sign-off."
            tone="success"
            actions={caseLink}
          />
        );

      case "ROLE_ALIGNMENT_REQUIRED":
      case "ROLE_ALIGNMENT_IN_PROGRESS":
        return (
          <StatusNotice
            icon="ri-group-line"
            title="Role Alignment Conversation Required"
            message={NOT_ALIGNED_MESSAGE}
            tone="info"
            bullets={[
              "Role purpose and contribution",
              "Key responsibilities and deliverables",
              "Decision-making authority and boundaries",
              "Success measures and expectations",
              "Key interfaces/stakeholders",
              "Other areas identified during the assessment",
            ]}
            actions={caseLink}
          />
        );

      case "ROLE_ALIGNMENT_COMPLETED":
        return (
          <StatusNotice
            icon="ri-check-double-line"
            title="Alignment Conversation Completed – HOD Closure Required"
            message="The Role Alignment Conversation has been completed. Please record the final outcome/comments and provide HOD sign-off to close the Role Clarity Review."
            tone="success"
            actions={caseLink}
          />
        );

      case "COMPLETED": {
        const label = employee?.designation
          ? `${employeeName} – ${employee.designation}`
          : employeeName;
        const closedAtCheck = record.initialClarityResponse === "YES" && !record.hodSignoff;
        const message = closedAtCheck
          ? YES_CLARITY_MESSAGE
          : record.alignmentConversation?.status === "COMPLETED"
            ? CLOSURE_MESSAGE.replace("{employee}", label)
            : CLOSURE_MESSAGE_NO_CONVERSATION.replace("{employee}", label);
        return (
          <StatusNotice
            icon="ri-checkbox-circle-line"
            title={closedAtCheck ? "Role Clarity Confirmed" : "Role Clarity Review Completed"}
            message={message}
            tone="success"
            actions={caseLink}
          />
        );
      }

      default:
        return null;
    }
  };

  // The Initial Role Clarity Check is the very first question. It is presented
  // on its own so the employee answers it before any form field appears.
  const isFirstQuestion =
    record.status === "DRAFT" || record.status === "INITIAL_CLARITY_CHECK";

  if (isFirstQuestion) {
    const stepLabel = STEPPER_STEPS[currentStepIndex(record.status)];
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 py-1 sm:gap-6 sm:py-4">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-700">
            <i className="ri-question-answer-line text-2xl" />
          </span>
          <p className="mt-4 font-label text-xs font-semibold uppercase tracking-widest text-primary-600">
            {stepLabel.label} · Step {currentStepIndex(record.status) + 1} of{" "}
            {STEPPER_STEPS.length}
          </p>
          <h1 className="mt-2 font-heading text-xl font-semibold text-foreground-950 sm:text-2xl md:text-3xl">
            Welcome, {employeeName.split(" ")[0]}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground-600">
            Let&apos;s begin your Role Clarity Review. Answer this first question
            to continue — the detailed self assessment form opens only after
            this step.
          </p>
        </div>

        <InitialCheck
          onResolve={(response) =>
            toastResult(submitInitialClarity(record, response))
          }
        />

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-foreground-500">
          <span className="inline-flex items-center gap-1.5">
            <i className="ri-lock-line text-base" />
            Reference {record.code}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="ri-shield-check-line text-base" />
            Your progress and every action are recorded in the audit trail
          </span>
        </div>
      </div>
    );
  }

  // The Self Assessment stage is presented as a focused screen showing only
  // the Sections A–D form fields, without the case-file header around it.
  const isSelfAssessment = record.status === "SELF_ASSESSMENT_PENDING";

  if (isSelfAssessment) {
    const stepLabel = STEPPER_STEPS[currentStepIndex(record.status)];
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
        <div className="flex flex-col">
          <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-primary-600">
            {stepLabel.label} · Step {currentStepIndex(record.status) + 1} of{" "}
            {STEPPER_STEPS.length}
          </p>
          <h1 className="mt-0.5 font-heading text-lg font-semibold text-foreground-950 sm:text-xl">
            Your Role Clarity Self Assessment
          </h1>
          <p className="mt-0.5 max-w-2xl text-xs text-foreground-600 sm:text-sm">
            Complete the form with your responsibilities, the 7 clarity
            dimensions, and your comments. You can save your progress as a draft
            at any time and submit once all required checks are completed.
          </p>
        </div>

        <SelfAssessmentForm
          assessment={record}
          employee={employee}
          managerName={managerName}
          onSaveDraft={(input) =>
            toastResult(saveSelfAssessmentDraft(record, input))
          }
          onSubmit={(input) => toastResult(submitSelfAssessment(record, input))}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Employee workspace"
        title="My Role Clarity Review"
        description="Complete each stage of the review. Your progress is saved as you go, and every action is recorded in the audit trail."
      />

      <CaseHeader assessment={record} employee={employee} />

      {renderStage()}
    </div>
  );
}