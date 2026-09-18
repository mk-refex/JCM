import * as XLSX from "xlsx";
import { getPool } from "../db.js";
import { config } from "../config.js";
import {
  getInitialCheckDigest,
  markDigestAutoSent,
} from "./settings.js";
import { sendInitialCheckDigestMail } from "./mailer.js";

const DIGEST_ASSESSMENT_ID = "DIGEST-INITIAL-CHECK";

/** Stable sheet order for the campaign workbook. */
const STATUS_SHEET_ORDER = [
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

function parsePayload(value) {
  if (value == null) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

/** Active = employment_status 1 AND employment_status_description Active */
export function isActiveEmployment(payload) {
  const data = payload || {};
  const status = data.employment_status;
  const statusOk = status === 1 || status === "1" || Number(status) === 1;
  const description = String(data.employment_status_description || "")
    .trim()
    .toLowerCase();
  return statusOk && description === "active";
}

function mapAssessmentRow(row) {
  const payload = parsePayload(row.user_payload);
  const data = parsePayload(row.assessment_data);
  return {
    assessmentId: row.assessment_id,
    code: row.code,
    status: row.status,
    employeeId: row.employee_id,
    empId: row.emp_id,
    name: row.name,
    email: row.email,
    designation: row.designation,
    businessUnit: row.business_unit,
    functionName: row.function_name,
    department: row.department,
    location: row.location,
    initialClarityResponse: data.initialClarityResponse ?? "",
    employmentStatus: payload.employment_status ?? "",
    employmentStatusDescription: payload.employment_status_description ?? "",
    employeeStatusDescription: payload.employee_status_description ?? "",
    supervisorName: payload.supervisor_name ?? "",
    supervisorEmail: payload.supervisor_email ?? "",
    l2ManagerName: payload.l2_manager_name ?? "",
    l2ManagerEmail: payload.l2_manager_email ?? "",
    payload,
  };
}

/** All active employees' assessments (any status), for the multi-sheet workbook. */
export async function listActiveAssessments() {
  const db = await getPool();
  const [rows] = await db.query(
    `SELECT a.id AS assessment_id, a.code, a.status, a.data AS assessment_data,
            e.id AS employee_id, e.emp_id, e.name, e.email,
            e.designation, e.business_unit, e.function_name, e.department,
            e.location, u.payload AS user_payload
     FROM assessments a
     INNER JOIN employees e ON e.id = a.employee_id
     INNER JOIN users u ON u.id = e.id
     ORDER BY a.status ASC, e.name ASC`,
  );

  return rows
    .map(mapAssessmentRow)
    .filter((row) => isActiveEmployment(row.payload))
    .map(({ payload: _payload, ...row }) => row);
}

/** Active employees who have not answered the Initial Role Clarity Check. */
export async function listNotStartedInitialCheck() {
  const all = await listActiveAssessments();
  return all.filter(
    (row) =>
      (row.status === "INITIAL_CLARITY_CHECK" || row.status === "DRAFT") &&
      (row.initialClarityResponse == null || row.initialClarityResponse === ""),
  );
}

function toSheetRow(row, index) {
  return {
    "#": index + 1,
    "Employee ID": row.empId || "",
    Name: row.name || "",
    Email: row.email || "",
    Designation: row.designation || "",
    "Business Unit": row.businessUnit || "",
    Function: row.functionName || "",
    Department: row.department || "",
    Location: row.location || "",
    "Assessment code": row.code || "",
    Status: row.status || "",
    "Initial clarity response": row.initialClarityResponse || "",
    "Employment status": row.employmentStatus,
    "Employment status description": row.employmentStatusDescription,
    Supervisor: row.supervisorName || "",
    "Supervisor email": row.supervisorEmail || "",
    "L2 manager": row.l2ManagerName || "",
    "L2 manager email": row.l2ManagerEmail || "",
  };
}

function emptySheetPlaceholder(status) {
  return [
    {
      "#": "",
      "Employee ID": "",
      Name: `No active employees in ${status}`,
      Email: "",
      Designation: "",
      "Business Unit": "",
      Function: "",
      Department: "",
      Location: "",
      "Assessment code": "",
      Status: status,
      "Initial clarity response": "",
      "Employment status": "",
      "Employment status description": "",
      Supervisor: "",
      "Supervisor email": "",
      "L2 manager": "",
      "L2 manager email": "",
    },
  ];
}

/** Excel sheet names must be ≤ 31 characters. */
function sheetNameForStatus(status) {
  return String(status || "UNKNOWN").slice(0, 31);
}

export function buildStatusWorkbookBuffer(assessments) {
  const byStatus = new Map();
  for (const row of assessments) {
    const key = row.status || "UNKNOWN";
    if (!byStatus.has(key)) byStatus.set(key, []);
    byStatus.get(key).push(row);
  }

  const ordered = [
    ...STATUS_SHEET_ORDER.filter((status) => byStatus.has(status)),
    ...[...byStatus.keys()].filter((status) => !STATUS_SHEET_ORDER.includes(status)),
  ];

  // Always include the main stages even when empty, so the workbook is predictable.
  for (const status of [
    "INITIAL_CLARITY_CHECK",
    "SELF_ASSESSMENT_PENDING",
    "MANAGER_ASSESSMENT_PENDING",
    "EMPLOYEE_ALIGNMENT_PENDING",
    "HOD_SIGNOFF_PENDING",
    "COMPLETED",
  ]) {
    if (!ordered.includes(status)) ordered.push(status);
  }

  const book = XLSX.utils.book_new();
  for (const status of ordered) {
    const list = byStatus.get(status) || [];
    const sheetRows = list.length
      ? list.map((row, index) => toSheetRow(row, index))
      : emptySheetPlaceholder(status);
    const sheet = XLSX.utils.json_to_sheet(sheetRows);
    XLSX.utils.book_append_sheet(book, sheet, sheetNameForStatus(status));
  }

  return XLSX.write(book, { type: "buffer", bookType: "xlsx" });
}

async function resolveRecipients(digest) {
  const db = await getPool();
  const people = [];
  const ids = Array.isArray(digest.recipientIds) ? digest.recipientIds.filter(Boolean) : [];

  if (ids.length) {
    const [rows] = await db.query(
      `SELECT id, name, email, designation FROM employees
       WHERE id IN (${ids.map(() => "?").join(",")})`,
      ids,
    );
    people.push(...rows);
  }

  const extras = String(digest.extraEmails || "")
    .split(/[,;\s]+/)
    .map((value) => value.trim())
    .filter((value) => value.includes("@"));

  for (const email of extras) {
    people.push({
      id: `EMAIL-${email.toLowerCase()}`,
      name: email.split("@")[0],
      email,
      designation: "Digest recipient",
    });
  }

  if (!people.length && config.admin.email) {
    people.push({
      id: "ADMIN",
      name: config.admin.name || "HR Administrator",
      email: config.admin.email,
      designation: "HR Administrator",
    });
  }

  const seen = new Set();
  return people.filter((person) => {
    const email = String(person.email || "").trim().toLowerCase();
    if (!email.includes("@") || seen.has(email)) return false;
    seen.add(email);
    return true;
  });
}

export async function dispatchInitialCheckDigest({
  trigger = "manual",
  sentKey = null,
} = {}) {
  const digest = await getInitialCheckDigest();
  const assessments = await listActiveAssessments();
  const pending = assessments.filter(
    (row) =>
      (row.status === "INITIAL_CLARITY_CHECK" || row.status === "DRAFT") &&
      (row.initialClarityResponse == null || row.initialClarityResponse === ""),
  );
  const recipients = await resolveRecipients(digest);
  const excelBuffer = buildStatusWorkbookBuffer(assessments);
  const today = new Date().toISOString().slice(0, 10);
  const attachment = {
    filename: `role-clarity-status-${today}.xlsx`,
    content: excelBuffer,
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };

  if (!recipients.length) {
    throw new Error(
      "No digest recipients configured. Select users or add emails on the Admin SLA page.",
    );
  }

  const result = await sendInitialCheckDigestMail({
    assessmentId: DIGEST_ASSESSMENT_ID,
    recipients,
    subject: digest.subject,
    bodyIntro: digest.bodyIntro,
    bodyOutro: digest.bodyOutro,
    pendingCount: pending.length,
    trigger,
    attachment,
  });

  if (trigger === "auto" && sentKey) {
    await markDigestAutoSent(sentKey);
  }

  return {
    sent: result.sent,
    recipientCount: recipients.length,
    pendingCount: pending.length,
    recipients: recipients.map((r) => r.email),
    trigger,
  };
}

/** Used by the scheduler to decide whether to fire now. */
export function shouldRunDigestNow(digest, now = new Date()) {
  if (!digest?.enabled) return { run: false, reason: "disabled" };

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: digest.timezone || "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type) => parts.find((p) => p.type === type)?.value;
  const ymd = `${get("year")}-${get("month")}-${get("day")}`;
  let hour = String(get("hour") || "0");
  if (hour === "24") hour = "00";
  const hm = `${hour.padStart(2, "0")}:${String(get("minute") || "0").padStart(2, "0")}`;

  if (digest.activeFrom && ymd < digest.activeFrom) {
    return { run: false, reason: "before-active-window" };
  }
  if (digest.activeTo && ymd > digest.activeTo) {
    return { run: false, reason: "after-active-window" };
  }

  const times = Array.isArray(digest.scheduleTimes) ? digest.scheduleTimes : [];
  if (!times.includes(hm)) {
    return { run: false, reason: "time-mismatch" };
  }

  const dates = Array.isArray(digest.scheduleDates) ? digest.scheduleDates : [];
  if (dates.length && !dates.includes(ymd)) {
    return { run: false, reason: "date-not-listed" };
  }

  const sentKey = `${ymd}T${hm}`;
  if (digest.lastAutoSentKey === sentKey) {
    return { run: false, reason: "already-sent", sentKey };
  }

  return { run: true, sentKey, ymd, hm };
}
