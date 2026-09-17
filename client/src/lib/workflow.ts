import type { WorkflowStatus } from "@/types/domain";

export const WORKFLOW_TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
  DRAFT: ["INITIAL_CLARITY_CHECK"],
  INITIAL_CLARITY_CHECK: ["SELF_ASSESSMENT_PENDING", "COMPLETED"],
  SELF_ASSESSMENT_PENDING: ["MANAGER_ASSESSMENT_PENDING"],
  MANAGER_ASSESSMENT_PENDING: ["MANAGER_ASSESSMENT_COMPLETED"],
  MANAGER_ASSESSMENT_COMPLETED: ["EMPLOYEE_ALIGNMENT_PENDING"],
  EMPLOYEE_ALIGNMENT_PENDING: [
    "ALIGNED",
    "ROLE_ALIGNMENT_REQUIRED",
    "ROLE_ALIGNMENT_IN_PROGRESS",
    "HOD_SIGNOFF_PENDING",
  ],
  ALIGNED: ["HOD_SIGNOFF_PENDING"],
  ROLE_ALIGNMENT_REQUIRED: ["ROLE_ALIGNMENT_IN_PROGRESS"],
  ROLE_ALIGNMENT_IN_PROGRESS: ["ROLE_ALIGNMENT_COMPLETED", "HOD_SIGNOFF_PENDING"],
  ROLE_ALIGNMENT_COMPLETED: ["HOD_SIGNOFF_PENDING"],
  HOD_SIGNOFF_PENDING: ["COMPLETED"],
  COMPLETED: [],
};

export function canTransition(
  from: WorkflowStatus,
  to: WorkflowStatus,
): boolean {
  return (WORKFLOW_TRANSITIONS[from] ?? []).includes(to);
}

export function isTerminal(status: WorkflowStatus): boolean {
  return status === "COMPLETED";
}

export function isEditableByEmployee(status: WorkflowStatus): boolean {
  return (
    status === "DRAFT" ||
    status === "INITIAL_CLARITY_CHECK" ||
    status === "SELF_ASSESSMENT_PENDING"
  );
}

export function isAwaitingManager(status: WorkflowStatus): boolean {
  return status === "MANAGER_ASSESSMENT_PENDING";
}

export function isAwaitingAlignment(status: WorkflowStatus): boolean {
  return (
    status === "EMPLOYEE_ALIGNMENT_PENDING" ||
    status === "MANAGER_ASSESSMENT_COMPLETED"
  );
}

export function isAlignmentStage(status: WorkflowStatus): boolean {
  return (
    status === "ROLE_ALIGNMENT_REQUIRED" ||
    status === "ROLE_ALIGNMENT_IN_PROGRESS"
  );
}

export interface StepperStep {
  key: string;
  label: string;
  hint: string;
}

export const STEPPER_STEPS: StepperStep[] = [
  { key: "initial", label: "Initial Check", hint: "Role clarity self-check" },
  { key: "self", label: "Self Assessment", hint: "Sections A–D" },
  { key: "manager", label: "Manager Assessment", hint: "Independent rating" },
  { key: "alignment", label: "Alignment", hint: "Employee confirmation" },
  { key: "conversation", label: "Alignment Conversation", hint: "If required" },
  { key: "hod", label: "HOD Sign-off", hint: "Final approval" },
  { key: "completed", label: "Completed", hint: "Case closed" },
];

const STATUS_TO_STEP_INDEX: Record<WorkflowStatus, number> = {
  DRAFT: 0,
  INITIAL_CLARITY_CHECK: 0,
  SELF_ASSESSMENT_PENDING: 1,
  MANAGER_ASSESSMENT_PENDING: 2,
  MANAGER_ASSESSMENT_COMPLETED: 3,
  EMPLOYEE_ALIGNMENT_PENDING: 3,
  ALIGNED: 5,
  ROLE_ALIGNMENT_REQUIRED: 4,
  ROLE_ALIGNMENT_IN_PROGRESS: 4,
  ROLE_ALIGNMENT_COMPLETED: 5,
  HOD_SIGNOFF_PENDING: 5,
  COMPLETED: 6,
};

export function currentStepIndex(status: WorkflowStatus): number {
  return STATUS_TO_STEP_INDEX[status] ?? 0;
}

export function conversationRequired(status: WorkflowStatus): boolean {
  return (
    status === "ROLE_ALIGNMENT_REQUIRED" ||
    status === "ROLE_ALIGNMENT_IN_PROGRESS" ||
    status === "ROLE_ALIGNMENT_COMPLETED" ||
    status === "ALIGNED" ||
    status === "HOD_SIGNOFF_PENDING" ||
    status === "COMPLETED"
  );
}

export function progressPercent(status: WorkflowStatus): number {
  const index = currentStepIndex(status);
  return Math.round(((index + 1) / STEPPER_STEPS.length) * 100);
}

export function emptyStatusMessage(status: WorkflowStatus): string {
  switch (status) {
    case "DRAFT":
      return "This assessment has been created. Start the Initial Role Clarity Check to begin.";
    case "INITIAL_CLARITY_CHECK":
      return "Complete the Initial Role Clarity Check to proceed.";
    case "SELF_ASSESSMENT_PENDING":
      return "The Self Assessment is pending. Section A–D must be completed and submitted.";
    case "MANAGER_ASSESSMENT_PENDING":
      return "Awaiting the Reporting Manager's independent assessment.";
    case "MANAGER_ASSESSMENT_COMPLETED":
    case "EMPLOYEE_ALIGNMENT_PENDING":
      return "Manager assessment received. Confirm whether the expectations are aligned.";
    case "ALIGNED":
      return "Alignment confirmed. Awaiting HOD final sign-off.";
    case "ROLE_ALIGNMENT_REQUIRED":
    case "ROLE_ALIGNMENT_IN_PROGRESS":
      return "A Role Alignment Conversation is underway to reach a shared understanding of the role — this is constructive clarification, not an escalation.";
    case "ROLE_ALIGNMENT_COMPLETED":
      return "Alignment conversation completed. Awaiting HOD final sign-off.";
    case "HOD_SIGNOFF_PENDING":
      return "Awaiting the HOD's final comments and sign-off.";
    case "COMPLETED":
      return "This Role Clarity Review is formally closed.";
    default:
      return "";
  }
}