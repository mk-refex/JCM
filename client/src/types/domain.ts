export type UserRole =
  | "EMPLOYEE"
  | "REPORTING_MANAGER"
  | "HOD"
  | "HRBP"
  | "ADMIN";

export type WorkflowStatus =
  | "DRAFT"
  | "INITIAL_CLARITY_CHECK"
  | "SELF_ASSESSMENT_PENDING"
  | "MANAGER_ASSESSMENT_PENDING"
  | "MANAGER_ASSESSMENT_COMPLETED"
  | "EMPLOYEE_ALIGNMENT_PENDING"
  | "ALIGNED"
  | "ROLE_ALIGNMENT_REQUIRED"
  | "ROLE_ALIGNMENT_IN_PROGRESS"
  | "ROLE_ALIGNMENT_COMPLETED"
  | "HOD_SIGNOFF_PENDING"
  | "COMPLETED";

export type InitialClarityResponse = "YES" | "PARTIALLY" | "NO";
export type RagStatus = "GREEN" | "AMBER" | "RED";
export type AlignmentStatus = "PENDING" | "ALIGNED" | "NOT_ALIGNED";
export type SlaStatus = "ON_TRACK" | "DUE_SOON" | "BREACHED" | "COMPLETED";
export type ConversationStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";

export interface DimensionDef {
  key: string;
  order: number;
  name: string;
  shortName: string;
  definition: string;
}

export interface RatingOption {
  score: number;
  label: string;
  definition: string;
}

export interface Responsibility {
  id: string;
  text: string;
  percent: number | null;
}

export interface DimensionRating {
  dimensionKey: string;
  score: number | null;
}

export interface DimensionGap {
  dimensionKey: string;
  name: string;
  shortName: string;
  employeeScore: number | null;
  managerScore: number | null;
  gap: number | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  employeeId: string | null;
  title: string;
}

export interface MasterUser {
  id: string;
  employeeCode: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  designation: string | null;
  department: string | null;
  role: string | null;
  status: string | null;
  location: string | null;
  managerName: string | null;
  company: string | null;
  dateOfJoining: string | null;
  syncedAt?: string | null;
  payload: Record<string, unknown>;
}

export interface MasterUserField {
  key: string;
  value: string;
}

export interface Employee {
  id: string;
  empId: string;
  name: string;
  company: string;
  businessUnit: string;
  functionName: string;
  department: string;
  designation: string;
  grade: string;
  location: string;
  dateOfJoining: string;
  managerId: string | null;
  hodId: string | null;
  hrbpId: string | null;
  email: string;
}

export interface SlaRecord {
  stage: string;
  assignedAt: string | null;
  dueAt: string | null;
  completedAt: string | null;
  slaStatus: SlaStatus;
  ageingDays: number;
}

export interface SignOff {
  hodId: string;
  hodName: string;
  signedAt: string;
  status: "SIGNED";
  comments: string;
}

export interface AlignmentConversation {
  scheduledDate: string | null;
  status: ConversationStatus;
  participants: string[];
  hodComments: string;
  hrbpComments: string;
  updatedAt: string;
}

export interface Assessment {
  id: string;
  code: string;
  employeeId: string;
  managerId: string | null;
  hodId: string | null;
  hrbpId: string | null;
  status: WorkflowStatus;
  initialClarityResponse: InitialClarityResponse | null;
  initialClarityAt: string | null;
  responsibilities: Responsibility[];
  employeeRatings: DimensionRating[];
  employeeComments: string;
  managerRatings: DimensionRating[];
  managerComments: string;
  roleExpectations: string;
  employeeOverallAverage: number | null;
  managerOverallAverage: number | null;
  overallGap: number | null;
  ragStatus: RagStatus | null;
  alignmentStatus: AlignmentStatus | null;
  alignmentAt: string | null;
  alignmentConversation: AlignmentConversation | null;
  hodComments: string;
  hrbpComments: string;
  hodSignoff: SignOff | null;
  sla: SlaRecord;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export type AuditAction =
  | "ASSESSMENT_CREATED"
  | "INITIAL_CLARITY_SUBMITTED"
  | "SELF_ASSESSMENT_SAVED"
  | "EMPLOYEE_SUBMITTED"
  | "MANAGER_ASSESSMENT_SAVED"
  | "MANAGER_SUBMITTED"
  | "ALIGNMENT_SELECTED"
  | "ALIGNMENT_STARTED"
  | "ALIGNMENT_COMPLETED"
  | "HRBP_COMMENTED"
  | "HOD_SIGNED_OFF"
  | "COMPLETED"
  | "REMINDER_SENT";

export interface AuditEntry {
  id: string;
  assessmentId: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: AuditAction;
  fromStatus: WorkflowStatus | null;
  toStatus: WorkflowStatus | null;
  comment: string;
  createdAt: string;
}

export type NotificationEvent =
  | "SELF_ASSESSMENT_ASSIGNED"
  | "MANAGER_ASSESSMENT_ASSIGNED"
  | "MANAGER_ASSESSMENT_COMPLETED"
  | "EMPLOYEE_ALIGNMENT_REQUIRED"
  | "NOT_ALIGNED"
  | "ALIGNMENT_CONVERSATION_REQUIRED"
  | "HOD_SIGNOFF_REQUIRED"
  | "SLA_REMINDER"
  | "SLA_BREACH"
  | "FINAL_CLOSURE";

export interface Notification {
  id: string;
  assessmentId: string;
  recipientId: string;
  recipientName: string;
  event: NotificationEvent;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface Reminder {
  id: string;
  assessmentId: string;
  recipientId: string;
  recipientName: string;
  stage: string;
  type: "AUTOMATED" | "MANUAL";
  sentAt: string;
  status: "SENT" | "PENDING";
}