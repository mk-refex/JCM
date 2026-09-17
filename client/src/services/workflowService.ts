import {
  NO_CLARITY_MESSAGE,
  NOT_ALIGNED_MESSAGE,
  PARTIAL_CLARITY_MESSAGE,
  YES_CLARITY_MESSAGE,
} from "@/constants/clarity";
import {
  computeRag,
  employeeAverage,
  managerAverage,
  overallGapOf,
} from "@/lib/rag";
import { buildDueDate, computeSlaStatus } from "@/lib/sla";
import { nowIso } from "@/lib/utils";
import { WORKFLOW_TRANSITIONS } from "@/lib/workflow";
import type {
  AlignmentStatus,
  Assessment,
  AuditAction,
  DimensionRating,
  InitialClarityResponse,
  NotificationEvent,
  Responsibility,
  SlaRecord,
  WorkflowStatus,
} from "@/types/domain";

export type NotificationTarget = "EMPLOYEE" | "MANAGER" | "HOD" | "HRBP" | "ALL";

export interface NotificationDraft {
  target: NotificationTarget;
  event: NotificationEvent;
  title: string;
  message: string;
}

export interface WorkflowResult {
  patch: Partial<Assessment>;
  auditAction: AuditAction;
  auditComment: string;
  notifications: NotificationDraft[];
  toastTone: "success" | "info";
  toastTitle: string;
  toastMessage: string;
}

export interface SelfAssessmentInput {
  responsibilities: Responsibility[];
  employeeRatings: DimensionRating[];
  employeeComments: string;
}

export interface ManagerAssessmentInput {
  managerRatings: DimensionRating[];
  managerComments: string;
  roleExpectations: string;
}

/** Resolves the employee and manager overall averages and the derived gap. */
function resolveComparison(
  assessment: Assessment,
  managerRatings: DimensionRating[],
) {
  const managerOverall = managerAverage(managerRatings);
  const employeeOverall =
    assessment.employeeOverallAverage ??
    employeeAverage(assessment.employeeRatings);
  const gap = overallGapOf(employeeOverall, managerOverall);
  return { managerOverall, employeeOverall, gap };
}

/** Builds a fresh SLA record for a stage that has just been assigned. */
export function createSla(stage: string): SlaRecord {
  const assignedAt = nowIso();
  const dueAt = buildDueDate(assignedAt, stage);
  return {
    stage,
    assignedAt,
    dueAt,
    completedAt: null,
    slaStatus: computeSlaStatus(dueAt, null),
    ageingDays: 0,
  };
}

export function completeSla(sla: SlaRecord): SlaRecord {
  const completedAt = nowIso();
  return { ...sla, completedAt, slaStatus: "COMPLETED" };
}

/** Breadth-first verification that a legal multi-step transition path exists. */
export function isValidPath(from: WorkflowStatus, to: WorkflowStatus): boolean {
  if (from === to) return true;
  const seen = new Set<WorkflowStatus>([from]);
  const queue: WorkflowStatus[] = [from];
  while (queue.length) {
    const current = queue.shift() as WorkflowStatus;
    const nextStates = WORKFLOW_TRANSITIONS[current] ?? [];
    for (const next of nextStates) {
      if (next === to) return true;
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return false;
}

/**
 * Initial Role Clarity Check.
 * YES -> the review is closed immediately at the initial check.
 * PARTIALLY / NO -> the detailed self assessment is opened.
 */
export function resolveInitialClarity(
  assessment: Assessment,
  response: InitialClarityResponse,
  employeeName: string,
): WorkflowResult {
  const at = nowIso();

  if (response === "YES") {
    return {
      patch: {
        initialClarityResponse: response,
        initialClarityAt: at,
        status: "COMPLETED",
        completedAt: at,
        sla: completeSla(assessment.sla),
      },
      auditAction: "INITIAL_CLARITY_SUBMITTED",
      auditComment:
        "Employee confirmed full clarity on the current role and expectations. Review closed at the initial check.",
      notifications: [
        {
          target: "EMPLOYEE",
          event: "FINAL_CLOSURE",
          title: "Role Clarity Confirmed",
          message: YES_CLARITY_MESSAGE,
        },
      ],
      toastTone: "success",
      toastTitle: "Role Clarity Confirmed",
      toastMessage: YES_CLARITY_MESSAGE,
    };
  }

  return {
    patch: {
      initialClarityResponse: response,
      initialClarityAt: at,
      status: "SELF_ASSESSMENT_PENDING",
      sla: createSla("SELF_ASSESSMENT_PENDING"),
    },
    auditAction: "INITIAL_CLARITY_SUBMITTED",
    auditComment:
      response === "PARTIALLY"
        ? "Employee reported partial clarity. The detailed self assessment was opened."
        : "Employee reported no clarity. The detailed self assessment was opened.",
    notifications: [
      {
        target: "EMPLOYEE",
        event: "SELF_ASSESSMENT_ASSIGNED",
        title:
          response === "PARTIALLY"
            ? "Role Clarity Assessment – Further Clarification Required"
            : "Role Clarity Assessment Required",
        message: response === "PARTIALLY" ? PARTIAL_CLARITY_MESSAGE : NO_CLARITY_MESSAGE,
      },
    ],
    toastTone: "success",
    toastTitle:
      response === "PARTIALLY"
        ? "Role Clarity Assessment – Further Clarification Required"
        : "Role Clarity Assessment Required",
    toastMessage: response === "PARTIALLY" ? PARTIAL_CLARITY_MESSAGE : NO_CLARITY_MESSAGE,
  };
}

/** Saves the self assessment as a draft without leaving the current stage. */
export function saveSelfAssessmentDraft(
  assessment: Assessment,
  input: SelfAssessmentInput,
): WorkflowResult {
  return {
    patch: {
      responsibilities: input.responsibilities,
      employeeRatings: input.employeeRatings,
      employeeComments: input.employeeComments,
      employeeOverallAverage: employeeAverage(input.employeeRatings),
    },
    auditAction: "SELF_ASSESSMENT_SAVED",
    auditComment: "Employee saved the self assessment as a draft.",
    notifications: [],
    toastTone: "info",
    toastTitle: "Draft saved",
    toastMessage:
      "Your progress has been saved. You can return and submit whenever you are ready.",
  };
}

/** Submits the self assessment and routes the case to the reporting manager. */
export function submitSelfAssessment(
  assessment: Assessment,
  input: SelfAssessmentInput,
): WorkflowResult {
  return {
    patch: {
      responsibilities: input.responsibilities,
      employeeRatings: input.employeeRatings,
      employeeComments: input.employeeComments,
      employeeOverallAverage: employeeAverage(input.employeeRatings),
      status: "MANAGER_ASSESSMENT_PENDING",
      sla: createSla("MANAGER_ASSESSMENT_PENDING"),
    },
    auditAction: "EMPLOYEE_SUBMITTED",
    auditComment:
      "Employee submitted the self assessment. Case routed to the reporting manager for an independent assessment.",
    notifications: [
      {
        target: "MANAGER",
        event: "MANAGER_ASSESSMENT_ASSIGNED",
        title: "Role Clarity Assessment Awaiting Your Action",
        message:
          "The employee has completed the Role Clarity Self-Assessment. Please complete your independent assessment of the role expectations.",
      },
    ],
    toastTone: "success",
    toastTitle: "Self assessment submitted",
    toastMessage:
      "Your assessment is now with your reporting manager. You will be notified when it is completed.",
  };
}

/** Saves the manager assessment as a draft without leaving the current stage. */
export function saveManagerAssessmentDraft(
  assessment: Assessment,
  input: ManagerAssessmentInput,
): WorkflowResult {
  const { managerOverall, gap } = resolveComparison(
    assessment,
    input.managerRatings,
  );
  return {
    patch: {
      managerRatings: input.managerRatings,
      managerComments: input.managerComments,
      roleExpectations: input.roleExpectations,
      managerOverallAverage: managerOverall,
      overallGap: gap,
      ragStatus: computeRag(managerOverall, gap),
    },
    auditAction: "MANAGER_ASSESSMENT_SAVED",
    auditComment: "Reporting manager saved the independent assessment as a draft.",
    notifications: [],
    toastTone: "info",
    toastTitle: "Draft saved",
    toastMessage:
      "Your assessment has been saved. You can return and submit whenever you are ready.",
  };
}

/** Submits the manager assessment and routes the case back to the employee. */
export function submitManagerAssessment(
  assessment: Assessment,
  input: ManagerAssessmentInput,
  employeeName: string,
): WorkflowResult {
  const { managerOverall, gap } = resolveComparison(
    assessment,
    input.managerRatings,
  );
  return {
    patch: {
      managerRatings: input.managerRatings,
      managerComments: input.managerComments,
      roleExpectations: input.roleExpectations,
      managerOverallAverage: managerOverall,
      overallGap: gap,
      ragStatus: computeRag(managerOverall, gap),
      status: "EMPLOYEE_ALIGNMENT_PENDING",
      sla: createSla("EMPLOYEE_ALIGNMENT_PENDING"),
    },
    auditAction: "MANAGER_SUBMITTED",
    auditComment:
      "Reporting manager submitted the independent assessment and role expectations. Case routed to the employee for alignment confirmation.",
    notifications: [
      {
        target: "EMPLOYEE",
        event: "MANAGER_ASSESSMENT_COMPLETED",
        title: "Manager Assessment Completed – Alignment Required",
        message:
          "Your Reporting Manager has completed the independent Role Clarity Assessment. Please review the role expectations and comments provided and indicate whether you are Aligned or Not Aligned.",
      },
      {
        target: "HRBP",
        event: "MANAGER_ASSESSMENT_COMPLETED",
        title: "Role Clarity Assessment – Manager Review Completed",
        message: `The Reporting Manager has completed the independent assessment and provided role expectations/comments for ${employeeName}.`,
      },
    ],
    toastTone: "success",
    toastTitle: "Manager assessment submitted",
    toastMessage:
      "Your independent assessment has been recorded. The case is now with the employee for alignment confirmation.",
  };
}

/**
 * Employee alignment decision on the manager's expectations.
 * ALIGNED -> HOD sign-off; NOT ALIGNED -> Role Alignment Conversation.
 */
export function submitAlignmentDecision(
  assessment: Assessment,
  decision: Exclude<AlignmentStatus, "PENDING">,
  employeeName: string,
): WorkflowResult {
  const at = nowIso();

  if (decision === "ALIGNED") {
    return {
      patch: {
        alignmentStatus: "ALIGNED",
        alignmentAt: at,
        status: "HOD_SIGNOFF_PENDING",
        sla: createSla("HOD_SIGNOFF_PENDING"),
      },
      auditAction: "ALIGNMENT_SELECTED",
      auditComment:
        "Employee confirmed the role expectations and clarifications are aligned. Case progressed to HOD final sign-off.",
      notifications: [
        {
          target: "EMPLOYEE",
          event: "HOD_SIGNOFF_REQUIRED",
          title: "Role Alignment Confirmed",
          message:
            "You have confirmed that the role expectations and clarifications provided by your Reporting Manager are aligned with your understanding. The assessment has now been routed to the HOD for final sign-off.",
        },
        {
          target: "HOD",
          event: "HOD_SIGNOFF_REQUIRED",
          title: "HOD Sign-Off Required",
          message: `${employeeName} and the Reporting Manager have completed the Role Clarity Review, and the employee has confirmed alignment with the role expectations. Please review and provide final sign-off.`,
        },
        {
          target: "HRBP",
          event: "EMPLOYEE_ALIGNMENT_REQUIRED",
          title: "Role Alignment Confirmed",
          message: `${employeeName} has confirmed alignment with the role expectations provided by the Reporting Manager. The case has been routed to the HOD for final sign-off.`,
        },
      ],
      toastTone: "success",
      toastTitle: "Role Alignment Confirmed",
      toastMessage:
        "You have confirmed that the role expectations and clarifications provided by your Reporting Manager are aligned with your understanding. The assessment has now been routed to the HOD for final sign-off.",
    };
  }

  return {
    patch: {
      alignmentStatus: "NOT_ALIGNED",
      alignmentAt: at,
      status: "ROLE_ALIGNMENT_IN_PROGRESS",
      sla: createSla("ROLE_ALIGNMENT_IN_PROGRESS"),
      alignmentConversation: {
        scheduledDate: at,
        status: "IN_PROGRESS",
        participants: ["Employee", "Reporting Manager", "HOD", "HRBP"],
        hodComments: assessment.alignmentConversation?.hodComments || "",
        hrbpComments: assessment.alignmentConversation?.hrbpComments || "",
        updatedAt: at,
      },
    },
    auditAction: "ALIGNMENT_SELECTED",
    auditComment:
      "Employee indicated the role expectations are not aligned. Case moved into the Role Alignment Conversation stage.",
      notifications: [
        {
          target: "EMPLOYEE",
          event: "NOT_ALIGNED",
          title: "Role Alignment Conversation Required",
          message: NOT_ALIGNED_MESSAGE,
        },
        {
          target: "MANAGER",
          event: "NOT_ALIGNED",
          title: "Role Alignment Conversation Required",
          message: NOT_ALIGNED_MESSAGE,
        },
        {
          target: "HOD",
          event: "NOT_ALIGNED",
          title: "Role Alignment Conversation Required",
          message: NOT_ALIGNED_MESSAGE,
        },
        {
          target: "HRBP",
          event: "NOT_ALIGNED",
          title: "Role Alignment Conversation Required",
          message: NOT_ALIGNED_MESSAGE,
        },
      ],
      toastTone: "success",
      toastTitle: "Role Alignment Conversation Required",
      toastMessage: NOT_ALIGNED_MESSAGE,
  };
}