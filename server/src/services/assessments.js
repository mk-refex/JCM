import { getPool } from "../db.js";
import { COPY } from "../lib/copy.js";
import { computeSlaStatus, nowIso, uid } from "../lib/sla.js";
import {
  loadStakeholders,
  sendAlignedEmails,
  sendClosureEmails,
  sendConversationDoneEmails,
  sendNoClarityEmails,
  sendNotAlignedEmails,
  sendManagerSubmitEmails,
  sendPartialClarityEmails,
  sendReminderEmails,
  sendSelfSubmitEmails,
  sendYesClarityEmails,
} from "./mailer.js";
import { createSla } from "./workflow.js";
import {
  resolveInitialClarity,
  saveAlignmentConversation,
  saveManagerAssessmentDraft,
  saveSelfAssessmentDraft,
  submitAlignmentDecision,
  submitHodSignoff,
  submitManagerAssessment,
  submitSelfAssessment,
} from "./workflow.js";

const SUBMITTED_MANAGER_STATUSES = new Set([
  "MANAGER_ASSESSMENT_COMPLETED",
  "EMPLOYEE_ALIGNMENT_PENDING",
  "ALIGNED",
  "ROLE_ALIGNMENT_REQUIRED",
  "ROLE_ALIGNMENT_IN_PROGRESS",
  "ROLE_ALIGNMENT_COMPLETED",
  "HOD_SIGNOFF_PENDING",
  "COMPLETED",
]);

function mysqlDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 19).replace("T", " ");
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toIso(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

export function rowToAssessment(row) {
  const data = parseJson(row.data, {});
  return {
    id: row.id,
    code: row.code,
    employeeId: row.employee_id,
    managerId: row.manager_id,
    hodId: row.hod_id,
    hrbpId: row.hrbp_id,
    status: row.status,
    initialClarityResponse: data.initialClarityResponse ?? null,
    initialClarityAt: data.initialClarityAt ?? null,
    responsibilities: data.responsibilities ?? [],
    employeeRatings: data.employeeRatings ?? [],
    employeeComments: data.employeeComments ?? "",
    managerRatings: data.managerRatings ?? [],
    managerComments: data.managerComments ?? "",
    roleExpectations: data.roleExpectations ?? "",
    employeeOverallAverage: data.employeeOverallAverage ?? null,
    managerOverallAverage: data.managerOverallAverage ?? null,
    overallGap: data.overallGap ?? null,
    ragStatus: data.ragStatus ?? null,
    alignmentStatus: data.alignmentStatus ?? null,
    alignmentAt: data.alignmentAt ?? null,
    alignmentConversation: data.alignmentConversation ?? null,
    hodComments: data.hodComments ?? "",
    hrbpComments: data.hrbpComments ?? "",
    hodSignoff: data.hodSignoff ?? null,
    sla: data.sla ?? createSla("INITIAL_CLARITY_CHECK"),
    createdAt: toIso(row.created_at) || nowIso(),
    updatedAt: toIso(row.updated_at) || nowIso(),
    completedAt: toIso(row.completed_at),
  };
}

export function canAccessAssessment(auth, assessment) {
  if (!auth) return false;
  if (auth.role === "ADMIN") return true;
  const id = auth.user?.employeeId || auth.user?.id;
  if (!id) return false;
  return (
    assessment.employeeId === id ||
    assessment.managerId === id ||
    assessment.hodId === id ||
    assessment.hrbpId === id
  );
}

export function applyResponseIsolation(auth, assessment) {
  const id = auth?.user?.employeeId || auth?.user?.id;
  const isManager = assessment.managerId === id;
  const canSeeEmployee =
    auth?.role === "ADMIN" ||
    assessment.employeeId === id ||
    !isManager ||
    SUBMITTED_MANAGER_STATUSES.has(assessment.status);
  if (canSeeEmployee) return assessment;
  return {
    ...assessment,
    employeeRatings: [],
    employeeComments: "",
    responsibilities: [],
    employeeOverallAverage: null,
    overallGap: null,
    ragStatus: null,
  };
}

function blankAssessment(employee) {
  const id = uid("AS");
  const year = new Date().getFullYear();
  return {
    id,
    code: `JCR-${year}-${String(employee.empId || employee.id).slice(-6)}`,
    employeeId: employee.id,
    managerId: employee.managerId,
    hodId: employee.hodId,
    hrbpId: employee.hrbpId,
    status: "INITIAL_CLARITY_CHECK",
    initialClarityResponse: null,
    initialClarityAt: null,
    responsibilities: [],
    employeeRatings: [],
    employeeComments: "",
    managerRatings: [],
    managerComments: "",
    roleExpectations: "",
    employeeOverallAverage: null,
    managerOverallAverage: null,
    overallGap: null,
    ragStatus: null,
    alignmentStatus: null,
    alignmentAt: null,
    alignmentConversation: null,
    hodComments: "",
    hrbpComments: "",
    hodSignoff: null,
    sla: createSla("INITIAL_CLARITY_CHECK"),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    completedAt: null,
  };
}

export async function ensureAssessmentsForEmployees() {
  const db = await getPool();
  const [employees] = await db.query(
    "SELECT id, emp_id, manager_id, hod_id, hrbp_id FROM employees",
  );
  const [existing] = await db.query("SELECT employee_id FROM assessments");
  const have = new Set(existing.map((row) => row.employee_id));
  const missing = employees.filter((row) => !have.has(row.id));
  if (!missing.length) return { created: 0 };

  const sql = `
    INSERT INTO assessments (
      id, code, employee_id, manager_id, hod_id, hrbp_id, status, data, created_at, updated_at
    ) VALUES ?
  `;
  const values = missing.map((row) => {
    const assessment = blankAssessment({
      id: row.id,
      empId: row.emp_id,
      managerId: row.manager_id,
      hodId: row.hod_id,
      hrbpId: row.hrbp_id,
    });
    return [
      assessment.id,
      assessment.code,
      assessment.employeeId,
      assessment.managerId,
      assessment.hodId,
      assessment.hrbpId,
      assessment.status,
      JSON.stringify(assessment),
      mysqlDate(assessment.createdAt),
      mysqlDate(assessment.updatedAt),
    ];
  });

  for (let i = 0; i < values.length; i += 100) {
    await db.query(sql, [values.slice(i, i + 100)]);
  }
  return { created: missing.length };
}

export async function listAssessmentsFor(auth) {
  const db = await getPool();
  let rows;
  if (auth.role === "ADMIN") {
    [rows] = await db.query("SELECT * FROM assessments ORDER BY updated_at DESC");
  } else {
    const id = auth.user.employeeId || auth.user.id;
    [rows] = await db.query(
      `SELECT * FROM assessments
       WHERE employee_id = ? OR manager_id = ? OR hod_id = ? OR hrbp_id = ?
       ORDER BY updated_at DESC`,
      [id, id, id, id],
    );
  }
  return rows.map((row) => applyResponseIsolation(auth, rowToAssessment(row)));
}

export async function getAssessmentFor(auth, id) {
  const db = await getPool();
  const [rows] = await db.query("SELECT * FROM assessments WHERE id = ? LIMIT 1", [id]);
  if (!rows[0]) return null;
  const assessment = rowToAssessment(rows[0]);
  if (!canAccessAssessment(auth, assessment)) return null;
  return applyResponseIsolation(auth, assessment);
}

async function saveAssessment(assessment) {
  const db = await getPool();
  assessment.updatedAt = nowIso();
  await db.query(
    `UPDATE assessments
     SET code = ?, employee_id = ?, manager_id = ?, hod_id = ?, hrbp_id = ?,
         status = ?, data = ?, updated_at = ?, completed_at = ?
     WHERE id = ?`,
    [
      assessment.code,
      assessment.employeeId,
      assessment.managerId,
      assessment.hodId,
      assessment.hrbpId,
      assessment.status,
      JSON.stringify(assessment),
      mysqlDate(assessment.updatedAt),
      assessment.completedAt ? mysqlDate(assessment.completedAt) : null,
      assessment.id,
    ],
  );
  return assessment;
}

async function addAudit(assessment, actor, result, fromStatus) {
  const db = await getPool();
  await db.query(
    `INSERT INTO audit_logs (
      id, assessment_id, actor_id, actor_name, actor_role, action, from_status, to_status, comment
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uid("AL"),
      assessment.id,
      actor.id,
      actor.name,
      actor.role,
      result.auditAction,
      fromStatus,
      result.patch.status ?? fromStatus,
      result.auditComment,
    ],
  );
}

function recipientIds(target, assessment) {
  switch (target) {
    case "EMPLOYEE":
      return assessment.employeeId ? [assessment.employeeId] : [];
    case "MANAGER":
      return assessment.managerId ? [assessment.managerId] : [];
    case "HOD":
      return assessment.hodId ? [assessment.hodId] : [];
    case "HRBP":
      return assessment.hrbpId ? [assessment.hrbpId] : [];
    case "ALL":
      return [assessment.employeeId, assessment.managerId, assessment.hodId, assessment.hrbpId].filter(Boolean);
    default:
      return [];
  }
}

async function addNotifications(assessment, drafts) {
  if (!drafts?.length) return [];
  const db = await getPool();
  const [employees] = await db.query("SELECT id, name FROM employees");
  const names = new Map(employees.map((row) => [row.id, row.name]));
  const created = [];
  for (const draft of drafts) {
    for (const recipientId of recipientIds(draft.target, assessment)) {
      const entry = {
        id: uid("NT"),
        assessmentId: assessment.id,
        recipientId,
        recipientName: names.get(recipientId) || "",
        event: draft.event,
        title: draft.title,
        message: draft.message,
        createdAt: nowIso(),
        read: false,
      };
      await db.query(
        `INSERT INTO notifications (
          id, assessment_id, recipient_id, recipient_name, event, title, message, is_read
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          entry.id,
          entry.assessmentId,
          entry.recipientId,
          entry.recipientName,
          entry.event,
          entry.title,
          entry.message,
        ],
      );
      created.push(entry);
    }
  }
  return created;
}

async function loadRaw(id) {
  const db = await getPool();
  const [rows] = await db.query("SELECT * FROM assessments WHERE id = ? LIMIT 1", [id]);
  return rows[0] ? rowToAssessment(rows[0]) : null;
}

async function applyWorkflow(auth, id, buildResult) {
  const assessment = await loadRaw(id);
  if (!assessment || !canAccessAssessment(auth, assessment)) {
    return { error: "Assessment not found.", status: 404 };
  }
  if (assessment.status === "COMPLETED") {
    return { error: "This case is closed and cannot be reopened.", status: 409 };
  }
  const fromStatus = assessment.status;
  let result;
  try {
    result = buildResult(assessment);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Workflow action failed.",
      status: 400,
    };
  }
  const next = { ...assessment, ...result.patch, updatedAt: nowIso() };
  await saveAssessment(next);
  await addAudit(next, auth.user, result, fromStatus);
  const notifications = await addNotifications(next, result.notifications);
  return {
    assessment: applyResponseIsolation(auth, next),
    notifications,
  };
}

async function namesFor(assessment) {
  if (!assessment) {
    return { employeeName: "the employee" };
  }
  const { names } = await loadStakeholders(assessment);
  return names;
}

export async function runInitialClarity(auth, id, response) {
  const assessment = await loadRaw(id);
  const names = await namesFor(assessment);
  const result = await applyWorkflow(auth, id, (current) =>
    resolveInitialClarity(current, response, names),
  );
  if (!result.error && result.assessment) {
    if (response === "YES") result.mail = await sendYesClarityEmails(result.assessment);
    else if (response === "NO") result.mail = await sendNoClarityEmails(result.assessment);
    else result.mail = await sendPartialClarityEmails(result.assessment);
  }
  return result;
}

export async function runSelfDraft(auth, id, input) {
  return applyWorkflow(auth, id, (assessment) => saveSelfAssessmentDraft(assessment, input));
}

export async function runSelfSubmit(auth, id, input) {
  const assessment = await loadRaw(id);
  const names = await namesFor(assessment);
  const result = await applyWorkflow(auth, id, (current) =>
    submitSelfAssessment(current, input, names),
  );
  if (!result.error && result.assessment) {
    result.mail = await sendSelfSubmitEmails(result.assessment);
  }
  return result;
}

export async function runManagerDraft(auth, id, input) {
  return applyWorkflow(auth, id, (assessment) => saveManagerAssessmentDraft(assessment, input));
}

export async function runManagerSubmit(auth, id, input) {
  const assessment = await loadRaw(id);
  const names = await namesFor(assessment);
  const result = await applyWorkflow(auth, id, (current) =>
    submitManagerAssessment(current, input, names),
  );
  if (!result.error && result.assessment) {
    result.mail = await sendManagerSubmitEmails(result.assessment);
  }
  return result;
}

export async function runAlignment(auth, id, decision) {
  const assessment = await loadRaw(id);
  const names = await namesFor(assessment);
  const result = await applyWorkflow(auth, id, (current) =>
    submitAlignmentDecision(current, decision, names),
  );
  if (!result.error && result.assessment) {
    if (decision === "NOT_ALIGNED") {
      result.mail = await sendNotAlignedEmails(result.assessment);
    } else {
      result.mail = await sendAlignedEmails(result.assessment);
    }
  }
  return result;
}

const CONVERSATION_STATUSES = new Set([
  "ROLE_ALIGNMENT_REQUIRED",
  "ROLE_ALIGNMENT_IN_PROGRESS",
]);

export async function runAlignmentConversation(auth, id, input = {}) {
  const assessment = await loadRaw(id);
  if (!assessment) return { error: "Assessment not found.", status: 404 };
  if (!canAccessAssessment(auth, assessment)) {
    return { error: "Assessment not found.", status: 404 };
  }

  const actorId = auth.user?.employeeId || auth.user?.id;
  const isHod = auth.role === "ADMIN" || assessment.hodId === actorId;
  const isHrbp = auth.role === "ADMIN" || assessment.hrbpId === actorId;

  if (!isHod && !isHrbp) {
    return {
      error: "Only the HOD or HRBP can record Role Alignment Conversation notes.",
      status: 403,
    };
  }
  if (!CONVERSATION_STATUSES.has(assessment.status)) {
    return {
      error: "This case is not in the Role Alignment Conversation stage.",
      status: 400,
    };
  }

  const payload = {};
  if (isHod && input.hodComments !== undefined) payload.hodComments = input.hodComments;
  if (isHrbp && input.hrbpComments !== undefined) payload.hrbpComments = input.hrbpComments;
  if (input.complete) payload.complete = true;

  const names = await namesFor(assessment);
  const result = await applyWorkflow(auth, id, (current) =>
    saveAlignmentConversation(current, payload, names),
  );
  if (
    !result.error &&
    result.assessment &&
    input.complete &&
    result.assessment.alignmentConversation?.status === "COMPLETED"
  ) {
    result.mail = await sendConversationDoneEmails(result.assessment);
  }
  return result;
}

const HOD_SIGNOFF_STATUSES = new Set([
  "HOD_SIGNOFF_PENDING",
  "ROLE_ALIGNMENT_COMPLETED",
  "ALIGNED",
]);

export async function runHodSignoff(auth, id, comments) {
  const assessment = await loadRaw(id);
  if (!assessment) return { error: "Assessment not found.", status: 404 };
  if (!canAccessAssessment(auth, assessment)) {
    return { error: "Assessment not found.", status: 404 };
  }

  const actorId = auth.user?.employeeId || auth.user?.id;
  const isHod = auth.role === "ADMIN" || assessment.hodId === actorId;
  if (!isHod) {
    return { error: "Only the HOD can sign off and close this case.", status: 403 };
  }
  if (!HOD_SIGNOFF_STATUSES.has(assessment.status)) {
    return { error: "This case is not awaiting HOD sign-off.", status: 400 };
  }

  const trimmed = String(comments || "").trim();
  if (!trimmed) {
    return { error: "Please add HOD comments before closing the case.", status: 400 };
  }

  const names = await namesFor(assessment);
  const result = await applyWorkflow(auth, id, (current) =>
    submitHodSignoff(
      current,
      trimmed,
      {
        id: actorId || auth.user.id,
        name: auth.user.name,
      },
      names,
    ),
  );
  if (!result.error && result.assessment?.status === "COMPLETED") {
    result.mail = await sendClosureEmails(result.assessment);
  }
  return result;
}

export async function listNotifications(auth) {
  const db = await getPool();
  const id = auth.role === "ADMIN" ? null : auth.user.employeeId || auth.user.id;
  const [rows] = id
    ? await db.query(
        "SELECT * FROM notifications WHERE recipient_id = ? ORDER BY created_at DESC",
        [id],
      )
    : await db.query("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 200");
  return rows.map((row) => ({
    id: row.id,
    assessmentId: row.assessment_id,
    recipientId: row.recipient_id,
    recipientName: row.recipient_name,
    event: row.event,
    title: row.title,
    message: row.message,
    createdAt: toIso(row.created_at) || nowIso(),
    read: Boolean(row.is_read),
  }));
}

export async function listAudit(assessmentId) {
  const db = await getPool();
  const [rows] = await db.query(
    "SELECT * FROM audit_logs WHERE assessment_id = ? ORDER BY created_at DESC",
    [assessmentId],
  );
  return rows.map((row) => ({
    id: row.id,
    assessmentId: row.assessment_id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    actorRole: row.actor_role,
    action: row.action,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    comment: row.comment,
    createdAt: toIso(row.created_at) || nowIso(),
  }));
}

export async function markNotificationRead(auth, id) {
  const db = await getPool();
  await db.query(
    "UPDATE notifications SET is_read = 1 WHERE id = ? AND recipient_id = ?",
    [id, auth.user.employeeId || auth.user.id],
  );
}

export async function markAllNotificationsRead(auth) {
  const db = await getPool();
  await db.query("UPDATE notifications SET is_read = 1 WHERE recipient_id = ?", [
    auth.user.employeeId || auth.user.id,
  ]);
}

function reminderTargets(status) {
  if (status === "MANAGER_ASSESSMENT_PENDING") return ["MANAGER"];
  if (status === "HOD_SIGNOFF_PENDING" || status === "ROLE_ALIGNMENT_COMPLETED") {
    return ["HOD"];
  }
  if (status === "ROLE_ALIGNMENT_IN_PROGRESS" || status === "ROLE_ALIGNMENT_REQUIRED") {
    return ["MANAGER", "HOD", "HRBP"];
  }
  return ["EMPLOYEE"];
}

export async function dispatchSlaReminders() {
  const db = await getPool();
  const [rows] = await db.query(
    "SELECT * FROM assessments WHERE status <> 'COMPLETED'",
  );
  let sent = 0;
  for (const row of rows) {
    const assessment = rowToAssessment(row);
    const slaStatus = computeSlaStatus(assessment.sla?.dueAt, assessment.completedAt);
    if (slaStatus !== "DUE_SOON" && slaStatus !== "BREACHED") continue;

    const [[{ already }]] = await db.query(
      `SELECT COUNT(*) AS already FROM mail_logs
       WHERE assessment_id = ? AND subject LIKE 'Reminder%' AND DATE(created_at) = CURDATE()`,
      [assessment.id],
    );
    if (Number(already) > 0) continue;

    const names = await namesFor(assessment);
    const notice = COPY.reminder.notice({
      employeeLabel: names.employeeLabel,
      dueDate: names.dueDate,
    });
    await addNotifications(
      assessment,
      reminderTargets(assessment.status).map((target) => ({
        target,
        event: slaStatus === "BREACHED" ? "SLA_BREACH" : "SLA_REMINDER",
        title: notice.title,
        message: notice.message,
      })),
    );
    await sendReminderEmails(assessment);
    sent += 1;
  }
  return { sent };
}

export function homePathFor(auth, assessments) {
  if (auth.role === "ADMIN") return "/app/users";
  const id = auth.user.employeeId || auth.user.id;
  const mine = assessments.find(
    (item) =>
      item.employeeId === id &&
      ["DRAFT", "INITIAL_CLARITY_CHECK", "SELF_ASSESSMENT_PENDING", "EMPLOYEE_ALIGNMENT_PENDING", "MANAGER_ASSESSMENT_COMPLETED"].includes(
        item.status,
      ),
  );
  if (mine) return `/app/review/${mine.id}`;
  return "/app/dashboard";
}
