import type {
  AlignmentStatus,
  DimensionDef,
  RagStatus,
  RatingOption,
  UserRole,
  WorkflowStatus,
} from "@/types/domain";

/**
 * SOURCE OF TRUTH: "ORG-WIDE JOB CLARITY EXERCISE" template.
 * Every definition below is copied verbatim from the workbook.
 */

export const COMPANY_NAME = "Refex Group";

export const CLARITY_DIMENSIONS: DimensionDef[] = [
  {
    key: "rolePurpose",
    order: 1,
    name: "Role Purpose & Objective",
    shortName: "Role Purpose",
    definition:
      "Clarity on why the role exists, its core purpose, and how it contributes to BU/company goals.",
  },
  {
    key: "responsibilities",
    order: 2,
    name: "Key Responsibilities & Tasks",
    shortName: "Responsibilities",
    definition:
      "Clarity on the key responsibilities, tasks and outcomes the employee is expected to own and deliver.",
  },
  {
    key: "reportingRelationships",
    order: 3,
    name: "Reporting Relationships",
    shortName: "Reporting",
    definition:
      "Clarity on reporting lines, supervisory relationships and relevant dotted-line relationships.",
  },
  {
    key: "decisionAuthority",
    order: 4,
    name: "Decision-Making Authority & Boundaries",
    shortName: "Authority",
    definition:
      "Clarity on what decisions the employee can take independently, and where approval or escalation is required.",
  },
  {
    key: "successMetrics",
    order: 5,
    name: "Success Metrics / How Performance is Measured",
    shortName: "Success Metrics",
    definition:
      "Clarity on the outcomes, KPIs and performance expectations against which the employee's performance will be assessed.",
  },
  {
    key: "stakeholders",
    order: 6,
    name: "Key Interfaces & Stakeholders",
    shortName: "Stakeholders",
    definition:
      "Clarity on the key internal and external stakeholders the employee is expected to work with and the nature of those interactions.",
  },
  {
    key: "growthPath",
    order: 7,
    name: "Growth Path Linked to Role",
    shortName: "Growth Path",
    definition:
      "Clarity on how the role supports the employee's development and potential career progression within the organisation.",
  },
];

export const DIMENSION_KEYS = CLARITY_DIMENSIONS.map((d) => d.key);

export const RATING_SCALE: RatingOption[] = [
  {
    score: 1,
    label: "Not clear at all",
    definition:
      "I do not understand my role's purpose, scope, or what is expected of me.",
  },
  {
    score: 2,
    label: "Slightly clear",
    definition:
      "I have a vague idea, but significant aspects of my role remain undefined or confusing.",
  },
  {
    score: 3,
    label: "Moderately clear",
    definition:
      "I understand the basics but need frequent clarification on specific aspects.",
  },
  {
    score: 4,
    label: "Clear",
    definition:
      "I understand my role well, with only occasional need for clarification.",
  },
  {
    score: 5,
    label: "Completely clear",
    definition:
      "I have complete, unambiguous understanding of my role, boundaries, and expectations.",
  },
];

/** RAG rule copied from the template: GREEN avg >= 4.0 & |gap| <= 1
 *  AMBER avg 3.0-3.9 or |gap| = 2 ; RED avg < 3.0 or |gap| >= 3 */
export const RAG_RULES = {
  greenMinAverage: 4.0,
  greenMaxAbsGap: 1,
  amberMinAverage: 3.0,
  amberMaxAbsGap: 2,
  redMaxAverage: 3.0,
  redMinAbsGap: 3,
};

export const BUSINESS_UNITS = [
  "Solar IPP",
  "Solar O&M",
  "Wind Turbine OEM",
  "Wind IPP",
  "Compressed Bio Gas (CBG)",
  "CBG Fertilisers",
  "Ash Disposal",
  "Coal Logistics",
  "Employee Transport Services",
  "Medical Technologies",
  "Airports & Transportation",
];

export const SHARED_SERVICES_FUNCTIONS = [
  "Accounts",
  "Corporate Finance",
  "Legal",
  "IT",
  "Corporate Affairs",
  "Corporate Secretarial",
  "Human Resources",
  "ESG",
  "Mergers & Acquisitions",
  "Investor Relations",
  "Corporate Communications",
  "Chief of Staff",
  "Administration",
];

export const DEPARTMENTS = [
  "Operations",
  "Engineering",
  "O&M",
  "Manufacturing",
  "Projects",
  "Sales & Marketing",
  "Logistics",
  "Fleet",
  "F&A",
  "Human Resources",
  "Legal",
  "IT",
  "Corporate",
];

export const GRADES = ["E1", "E2", "E3", "E4", "M1", "M2", "M3", "M4", "M5"];

export const LOCATIONS = [
  "Chennai, TN",
  "Hyderabad, TS",
  "Mumbai, MH",
  "Bengaluru, KA",
  "Ahmedabad, GJ",
  "Kolkata, WB",
  "Delhi NCR",
  "Tirupati, AP",
];

export interface StatusMeta {
  label: string;
  tone: "neutral" | "progress" | "success" | "warning" | "danger" | "accent";
  description: string;
  stageOwner: string;
}

export const WORKFLOW_STATUS_META: Record<WorkflowStatus, StatusMeta> = {
  DRAFT: {
    label: "Draft",
    tone: "neutral",
    description: "Assessment created but not yet started.",
    stageOwner: "Employee",
  },
  INITIAL_CLARITY_CHECK: {
    label: "Initial Clarity Check",
    tone: "progress",
    description: "Awaiting the employee's initial role clarity response.",
    stageOwner: "Employee",
  },
  SELF_ASSESSMENT_PENDING: {
    label: "Self Assessment Pending",
    tone: "progress",
    description: "Employee is completing self assessment Sections A–D.",
    stageOwner: "Employee",
  },
  MANAGER_ASSESSMENT_PENDING: {
    label: "Manager Assessment Pending",
    tone: "progress",
    description: "Awaiting the reporting manager's independent assessment.",
    stageOwner: "Manager",
  },
  MANAGER_ASSESSMENT_COMPLETED: {
    label: "Manager Assessment Completed",
    tone: "accent",
    description: "Manager has submitted; comparison is now available.",
    stageOwner: "Employee",
  },
  EMPLOYEE_ALIGNMENT_PENDING: {
    label: "Employee Alignment Pending",
    tone: "progress",
    description: "Employee must confirm whether expectations are aligned.",
    stageOwner: "Employee",
  },
  ALIGNED: {
    label: "Aligned",
    tone: "success",
    description: "Employee confirmed alignment; moving to HOD sign-off.",
    stageOwner: "HOD",
  },
  ROLE_ALIGNMENT_REQUIRED: {
    label: "Role Alignment Conversation",
    tone: "warning",
    description:
      "A constructive Role Alignment Conversation is required with the Employee, Reporting Manager, HOD and HRBP.",
    stageOwner: "HOD / HRBP",
  },
  ROLE_ALIGNMENT_IN_PROGRESS: {
    label: "Role Alignment Conversation",
    tone: "warning",
    description:
      "Constructive conversation in progress. The HOD records final comments; HRBP captures observations.",
    stageOwner: "HOD / HRBP",
  },
  ROLE_ALIGNMENT_COMPLETED: {
    label: "Role Alignment Completed",
    tone: "success",
    description: "Alignment conversation completed; moving to HOD sign-off.",
    stageOwner: "HOD",
  },
  HOD_SIGNOFF_PENDING: {
    label: "HOD Sign-off Pending",
    tone: "warning",
    description: "Awaiting the HOD's final comments and sign-off.",
    stageOwner: "HOD",
  },
  COMPLETED: {
    label: "Completed",
    tone: "success",
    description: "Formally closed. No further action possible.",
    stageOwner: "—",
  },
};

export interface RoleMeta {
  label: string;
  short: string;
  description: string;
}

export const ROLE_META: Record<UserRole, RoleMeta> = {
  EMPLOYEE: {
    label: "Employee",
    short: "Employee",
    description: "Completes self assessment and alignment check.",
  },
  REPORTING_MANAGER: {
    label: "Reporting Manager",
    short: "Manager",
    description: "Completes the independent manager assessment.",
  },
  HOD: {
    label: "Head of Department",
    short: "HOD",
    description: "Provides final comments and the terminal sign-off.",
  },
  HRBP: {
    label: "HR Business Partner",
    short: "HRBP",
    description: "Monitors cases and supports alignment conversations.",
  },
  ADMIN: {
    label: "HR Admin",
    short: "Admin",
    description: "Manages master data, SLA, analytics and reminders.",
  },
};

export const RAG_META: Record<
  RagStatus,
  { label: string; description: string }
> = {
  GREEN: {
    label: "Green",
    description: "Overall average ≥ 4.0 and absolute gap ≤ 1.",
  },
  AMBER: {
    label: "Amber",
    description: "Overall average 3.0–3.9 or absolute gap = 2.",
  },
  RED: {
    label: "Red",
    description: "Overall average < 3.0 or absolute gap ≥ 3.",
  },
};

export const ALIGNMENT_META: Record<
  Exclude<AlignmentStatus, "PENDING">,
  { label: string; description: string }
> = {
  ALIGNED: {
    label: "Aligned",
    description:
      "Role expectations and clarifications are aligned with the employee's understanding.",
  },
  NOT_ALIGNED: {
    label: "Not Aligned",
    description:
      "Areas of difference exist and require a Role Alignment Conversation.",
  },
};

/** Fixed campaign SLA windows (calendar dates, not working-day offsets). */
export type SlaStageConfig = {
  label: string;
  owner: string;
  /** Inclusive window start (YYYY-MM-DD). */
  openFrom: string;
  /** Inclusive due date (YYYY-MM-DD). */
  dueOn: string;
};

export const SLA_CONFIG: Record<string, SlaStageConfig> = {
  INITIAL_CLARITY_CHECK: {
    label: "Initial Role Clarity Check",
    owner: "Employee",
    openFrom: "2026-09-18",
    dueOn: "2026-09-22",
  },
  SELF_ASSESSMENT_PENDING: {
    label: "Employee Self Assessment",
    owner: "Employee",
    openFrom: "2026-09-18",
    dueOn: "2026-09-22",
  },
  MANAGER_ASSESSMENT_PENDING: {
    label: "Manager Assessment",
    owner: "Manager",
    openFrom: "2026-09-18",
    dueOn: "2026-09-25",
  },
  EMPLOYEE_ALIGNMENT_PENDING: {
    label: "Employee Alignment Check",
    owner: "Employee",
    openFrom: "2026-09-18",
    dueOn: "2026-09-25",
  },
  ROLE_ALIGNMENT_REQUIRED: {
    label: "Role Alignment Conversation",
    owner: "HOD / HRBP",
    openFrom: "2026-09-18",
    dueOn: "2026-09-29",
  },
  ROLE_ALIGNMENT_IN_PROGRESS: {
    label: "Role Alignment Conversation",
    owner: "HOD / HRBP",
    openFrom: "2026-09-18",
    dueOn: "2026-09-29",
  },
  HOD_SIGNOFF_PENDING: {
    label: "HOD Final Sign-off",
    owner: "HOD",
    openFrom: "2026-09-18",
    dueOn: "2026-09-29",
  },
};

export const CLOSURE_MESSAGE =
  "The Role Clarity Review for {employee} has been completed and formally signed off by the HOD. The role expectations have been clarified and alignment has been established through the Role Alignment Conversation.";

export const CLOSURE_MESSAGE_NO_CONVERSATION =
  "The Role Clarity Review for {employee} has been completed and formally signed off by the HOD.";

export const NOT_ALIGNED_MESSAGE =
  "The employee has indicated that the role expectations and clarifications provided are not yet fully aligned with their understanding of the role. A Role Alignment Conversation involving the Employee, Reporting Manager, HOD and HRBP is required to establish a shared understanding of the role and expectations.";

export const YES_CLARITY_MESSAGE =
  "You have indicated that you have clarity on your current role and expectations. No further action is required from you at this stage.";

export const NO_CLARITY_MESSAGE =
  "You have indicated that you do not currently have sufficient clarity on your role and expectations. Please complete the detailed Role Clarity Self-Assessment to identify the areas requiring clarification.";

export const PARTIAL_CLARITY_MESSAGE =
  "You have indicated that you have partial clarity on your role. Please complete the Role Clarity Self-Assessment and identify the specific areas where you require further clarification or alignment.";