import { COPY, formatDueDate } from "../lib/copy.js";
import { computeRag, employeeAverage, managerAverage, overallGapOf } from "../lib/rag.js";
import { buildDueDate, computeSlaStatus, nowIso } from "../lib/sla.js";

function createSla(stage) {
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

function completeSla(sla) {
  const completedAt = nowIso();
  return { ...sla, completedAt, slaStatus: "COMPLETED" };
}

function resolveComparison(assessment, managerRatings) {
  const managerOverall = managerAverage(managerRatings);
  const employeeOverall =
    assessment.employeeOverallAverage ?? employeeAverage(assessment.employeeRatings);
  const gap = overallGapOf(employeeOverall, managerOverall);
  return { managerOverall, employeeOverall, gap };
}

function asNames(value = {}) {
  if (typeof value === "string") {
    return {
      employeeName: value,
      employeeRole: "Role",
      managerName: "the Reporting Manager",
      hodName: "the HOD",
    };
  }
  return {
    employeeName: value.employeeName || "the employee",
    employeeRole: value.employeeRole || "Role",
    managerName: value.managerName || "the Reporting Manager",
    hodName: value.hodName || "the HOD",
  };
}

export function resolveInitialClarity(assessment, response, names) {
  const at = nowIso();
  const vars = asNames(names);
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
          title: COPY.yes.employeeNotice.title,
          message: COPY.yes.employeeNotice.message,
        },
      ],
    };
  }

  const sla = createSla("SELF_ASSESSMENT_PENDING");
  const notice = response === "PARTIALLY" ? COPY.partial.employeeNotice : COPY.no.employeeNotice;
  return {
    patch: {
      initialClarityResponse: response,
      initialClarityAt: at,
      status: "SELF_ASSESSMENT_PENDING",
      sla,
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
        title: notice.title,
        message: notice.message,
      },
    ],
  };
}

export function saveSelfAssessmentDraft(assessment, input) {
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
  };
}

export function submitSelfAssessment(assessment, input, names) {
  const vars = asNames(names);
  const sla = createSla("MANAGER_ASSESSMENT_PENDING");
  const dueDate = formatDueDate(sla.dueAt);
  const managerNotice = COPY.selfSubmit.managerNotice({
    employeeName: vars.employeeName,
    dueDate,
  });
  return {
    patch: {
      responsibilities: input.responsibilities,
      employeeRatings: input.employeeRatings,
      employeeComments: input.employeeComments,
      employeeOverallAverage: employeeAverage(input.employeeRatings),
      status: "MANAGER_ASSESSMENT_PENDING",
      sla,
    },
    auditAction: "EMPLOYEE_SUBMITTED",
    auditComment: "Employee submitted the self assessment. Case routed to the reporting manager.",
    notifications: [
      {
        target: "MANAGER",
        event: "MANAGER_ASSESSMENT_ASSIGNED",
        title: managerNotice.title,
        message: managerNotice.message,
      },
    ],
  };
}

export function saveManagerAssessmentDraft(assessment, input) {
  const { managerOverall, gap } = resolveComparison(assessment, input.managerRatings);
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
  };
}

export function submitManagerAssessment(assessment, input, names) {
  const vars = asNames(names);
  const { managerOverall, gap } = resolveComparison(assessment, input.managerRatings);
  const sla = createSla("EMPLOYEE_ALIGNMENT_PENDING");
  return {
    patch: {
      managerRatings: input.managerRatings,
      managerComments: input.managerComments,
      roleExpectations: input.roleExpectations,
      managerOverallAverage: managerOverall,
      overallGap: gap,
      ragStatus: computeRag(managerOverall, gap),
      status: "EMPLOYEE_ALIGNMENT_PENDING",
      sla,
    },
    auditAction: "MANAGER_SUBMITTED",
    auditComment: "Reporting manager submitted the independent assessment.",
    notifications: [
      {
        target: "EMPLOYEE",
        event: "MANAGER_ASSESSMENT_COMPLETED",
        title: COPY.managerSubmit.employeeNotice.title,
        message: COPY.managerSubmit.employeeNotice.message,
      },
      {
        target: "HRBP",
        event: "MANAGER_ASSESSMENT_COMPLETED",
        title: COPY.managerSubmit.hrbpMail(vars).subject,
        message: COPY.managerSubmit.hrbpMail(vars).paragraphs[0],
      },
    ],
  };
}

export function submitHodSignoff(assessment, comments, hod, names) {
  const at = nowIso();
  const trimmed = String(comments || "").trim();
  const vars = asNames(names);
  const hadConversation = assessment.alignmentConversation?.status === "COMPLETED";
  const notice = hadConversation
    ? COPY.closed.notice(vars)
    : COPY.closed.noticeWithoutConversation(vars);

  return {
    patch: {
      hodComments: trimmed,
      hodSignoff: {
        hodId: hod.id,
        hodName: hod.name,
        signedAt: at,
        status: "SIGNED",
        comments: trimmed,
      },
      status: "COMPLETED",
      completedAt: at,
      sla: completeSla(assessment.sla),
    },
    auditAction: "HOD_SIGNED_OFF",
    auditComment: trimmed
      ? `HOD signed off and closed the case. Comments: ${trimmed}`
      : "HOD signed off and closed the case.",
    notifications: [
      {
        target: "ALL",
        event: "FINAL_CLOSURE",
        title: notice.title,
        message: notice.message,
      },
    ],
  };
}

export function submitAlignmentDecision(assessment, decision, names) {
  const at = nowIso();
  const vars = asNames(names);
  if (decision === "ALIGNED") {
    const sla = createSla("HOD_SIGNOFF_PENDING");
    const hodNotice = COPY.aligned.hodNotice(vars);
    const hrbpNotice = COPY.aligned.hrbpNotice(vars);
    return {
      patch: {
        alignmentStatus: "ALIGNED",
        alignmentAt: at,
        status: "HOD_SIGNOFF_PENDING",
        sla,
      },
      auditAction: "ALIGNMENT_SELECTED",
      auditComment: "Employee confirmed alignment. Case progressed to HOD sign-off.",
      notifications: [
        {
          target: "EMPLOYEE",
          event: "HOD_SIGNOFF_REQUIRED",
          title: COPY.aligned.employeeNotice.title,
          message: COPY.aligned.employeeNotice.message,
        },
        {
          target: "HOD",
          event: "HOD_SIGNOFF_REQUIRED",
          title: hodNotice.title,
          message: hodNotice.message,
        },
        {
          target: "HRBP",
          event: "HOD_SIGNOFF_REQUIRED",
          title: hrbpNotice.title,
          message: hrbpNotice.message,
        },
      ],
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
        title: COPY.notAligned.notice.title,
        message: COPY.notAligned.notice.message,
      },
      {
        target: "MANAGER",
        event: "NOT_ALIGNED",
        title: COPY.notAligned.notice.title,
        message: COPY.notAligned.notice.message,
      },
      {
        target: "HOD",
        event: "NOT_ALIGNED",
        title: COPY.notAligned.notice.title,
        message: COPY.notAligned.notice.message,
      },
      {
        target: "HRBP",
        event: "NOT_ALIGNED",
        title: COPY.notAligned.notice.title,
        message: COPY.notAligned.notice.message,
      },
    ],
  };
}

export function saveAlignmentConversation(assessment, input = {}, names) {
  const at = nowIso();
  const vars = asNames(names);
  const existing = assessment.alignmentConversation || {
    scheduledDate: at,
    status: "IN_PROGRESS",
    participants: ["Employee", "Reporting Manager", "HOD", "HRBP"],
    hodComments: "",
    hrbpComments: "",
    updatedAt: at,
  };

  const hodComments =
    input.hodComments !== undefined
      ? String(input.hodComments || "").trim()
      : existing.hodComments || assessment.hodComments || "";
  const hrbpComments =
    input.hrbpComments !== undefined
      ? String(input.hrbpComments || "").trim()
      : existing.hrbpComments || assessment.hrbpComments || "";
  const complete = Boolean(input.complete);

  if (complete && !hodComments) {
    throw new Error(
      "Please add the HOD's final comments from the conversation before completing this stage.",
    );
  }

  const conversation = {
    ...existing,
    status: complete ? "COMPLETED" : "IN_PROGRESS",
    hodComments,
    hrbpComments,
    updatedAt: at,
  };

  if (!complete) {
    return {
      patch: {
        status: "ROLE_ALIGNMENT_IN_PROGRESS",
        alignmentConversation: conversation,
        hodComments,
        hrbpComments,
        sla:
          assessment.status === "ROLE_ALIGNMENT_IN_PROGRESS"
            ? assessment.sla
            : createSla("ROLE_ALIGNMENT_IN_PROGRESS"),
      },
      auditAction: input.hrbpComments !== undefined ? "HRBP_COMMENTED" : "ALIGNMENT_STARTED",
      auditComment: "Role Alignment Conversation notes were updated.",
      notifications: [],
    };
  }

  return {
    patch: {
      status: "HOD_SIGNOFF_PENDING",
      alignmentConversation: conversation,
      hodComments,
      hrbpComments,
      sla: createSla("HOD_SIGNOFF_PENDING"),
    },
    auditAction: "ALIGNMENT_COMPLETED",
    auditComment:
      "Role Alignment Conversation completed. A common understanding of the role has been recorded. Case moved to HOD sign-off.",
    notifications: [
      {
        target: "HOD",
        event: "HOD_SIGNOFF_REQUIRED",
        title: COPY.conversationDone.hodNotice(vars).title,
        message: COPY.conversationDone.hodNotice(vars).message,
      },
      {
        target: "HRBP",
        event: "HOD_SIGNOFF_REQUIRED",
        title: COPY.conversationDone.hrbpNotice(vars).title,
        message: COPY.conversationDone.hrbpNotice(vars).message,
      },
    ],
  };
}

export { createSla };
