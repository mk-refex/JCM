import * as XLSX from "xlsx";
import { WORKFLOW_STATUS_META } from "@/constants/clarity";
import { derivedGap, derivedRag, effectiveSla } from "@/lib/metrics";
import { normalizeSla } from "@/lib/sla";
import { formatDate } from "@/lib/utils";
import type { Assessment, Employee, WorkflowStatus } from "@/types/domain";

const STATUS_ORDER: WorkflowStatus[] = [
  "DRAFT",
  "INITIAL_CLARITY_CHECK",
  "SELF_ASSESSMENT_PENDING",
  "MANAGER_ASSESSMENT_PENDING",
  "MANAGER_ASSESSMENT_COMPLETED",
  "EMPLOYEE_ALIGNMENT_PENDING",
  "ALIGNED",
  "ROLE_ALIGNMENT_REQUIRED",
  "ROLE_ALIGNMENT_IN_PROGRESS",
  "ROLE_ALIGNMENT_COMPLETED",
  "HOD_SIGNOFF_PENDING",
  "COMPLETED",
];

function sheetNameForStatus(status: string) {
  return String(status || "UNKNOWN").slice(0, 31);
}

function toRow(
  assessment: Assessment,
  employee: Employee | undefined,
  index: number,
) {
  const sla = normalizeSla(assessment.sla, assessment.status);
  const gap = derivedGap(assessment);
  const rag = derivedRag(assessment);
  const slaStatus = effectiveSla(assessment);

  return {
    "#": index + 1,
    "Employee ID": employee?.empId || "",
    Name: employee?.name || "",
    Email: employee?.email || "",
    Designation: employee?.designation || "",
    "Business Unit": employee?.businessUnit || "",
    Function: employee?.functionName || "",
    Department: employee?.department || "",
    Location: employee?.location || "",
    "Assessment code": assessment.code || "",
    Status: assessment.status || "",
    "Status label":
      WORKFLOW_STATUS_META[assessment.status]?.label || assessment.status,
    "SLA due": formatDate(sla?.dueAt),
    "SLA status": slaStatus,
    Gap: gap === null ? "" : gap,
    RAG: rag || "",
    Alignment: assessment.alignmentStatus || "",
    "Initial clarity response": assessment.initialClarityResponse || "",
    "Created at": formatDate(assessment.createdAt),
    "Updated at": formatDate(assessment.updatedAt),
    "Completed at": formatDate(assessment.completedAt),
  };
}

function emptyPlaceholder(status: string) {
  return [
    {
      "#": "",
      "Employee ID": "",
      Name: `No assessments in ${status}`,
      Email: "",
      Designation: "",
      "Business Unit": "",
      Function: "",
      Department: "",
      Location: "",
      "Assessment code": "",
      Status: status,
      "Status label": WORKFLOW_STATUS_META[status as WorkflowStatus]?.label || status,
      "SLA due": "",
      "SLA status": "",
      Gap: "",
      RAG: "",
      Alignment: "",
      "Initial clarity response": "",
      "Created at": "",
      "Updated at": "",
      "Completed at": "",
    },
  ];
}

/**
 * Builds a multi-sheet workbook: one sheet per workflow status.
 * Pass the currently visible/filtered assessments.
 * When exporting the full list, empty status sheets are still included
 * for the main campaign stages (same pattern as the digest email).
 */
export function buildAssessmentsWorkbook(
  assessments: Assessment[],
  employeeById: (id: string) => Employee | undefined,
  options?: { includeEmptyStages?: boolean },
) {
  const includeEmpty = options?.includeEmptyStages ?? false;
  const byStatus = new Map<string, Assessment[]>();

  for (const assessment of assessments) {
    const key = assessment.status || "UNKNOWN";
    if (!byStatus.has(key)) byStatus.set(key, []);
    byStatus.get(key)!.push(assessment);
  }

  const ordered = [
    ...STATUS_ORDER.filter((status) => byStatus.has(status)),
    ...[...byStatus.keys()].filter(
      (status) => !STATUS_ORDER.includes(status as WorkflowStatus),
    ),
  ];

  if (includeEmpty) {
    for (const status of [
      "INITIAL_CLARITY_CHECK",
      "SELF_ASSESSMENT_PENDING",
      "MANAGER_ASSESSMENT_PENDING",
      "EMPLOYEE_ALIGNMENT_PENDING",
      "HOD_SIGNOFF_PENDING",
      "COMPLETED",
    ] as WorkflowStatus[]) {
      if (!ordered.includes(status)) ordered.push(status);
    }
  }

  const book = XLSX.utils.book_new();

  if (!ordered.length) {
    const sheet = XLSX.utils.json_to_sheet(emptyPlaceholder("NONE"));
    XLSX.utils.book_append_sheet(book, sheet, "NONE");
    return book;
  }

  for (const status of ordered) {
    const list = byStatus.get(status) || [];
    const rows = list.length
      ? list.map((assessment, index) =>
          toRow(assessment, employeeById(assessment.employeeId), index),
        )
      : emptyPlaceholder(status);
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(book, sheet, sheetNameForStatus(status));
  }

  return book;
}

export function downloadAssessmentsExcel(
  assessments: Assessment[],
  employeeById: (id: string) => Employee | undefined,
  options?: { filename?: string; includeEmptyStages?: boolean },
) {
  const book = buildAssessmentsWorkbook(assessments, employeeById, {
    includeEmptyStages: options?.includeEmptyStages,
  });
  const today = new Date().toISOString().slice(0, 10);
  const filename =
    options?.filename || `role-clarity-assessments-${today}.xlsx`;
  XLSX.writeFile(book, filename);
}
