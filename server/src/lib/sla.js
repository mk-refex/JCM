import { getSlaCampaign } from "../services/settings.js";

const FALLBACK_SLA = {
  INITIAL_CLARITY_CHECK: { openFrom: "2026-09-18", dueOn: "2026-09-22" },
  SELF_ASSESSMENT_PENDING: { openFrom: "2026-09-18", dueOn: "2026-09-22" },
  MANAGER_ASSESSMENT_PENDING: { openFrom: "2026-09-18", dueOn: "2026-09-25" },
  EMPLOYEE_ALIGNMENT_PENDING: { openFrom: "2026-09-18", dueOn: "2026-09-25" },
  ROLE_ALIGNMENT_REQUIRED: { openFrom: "2026-09-18", dueOn: "2026-09-29" },
  ROLE_ALIGNMENT_IN_PROGRESS: { openFrom: "2026-09-18", dueOn: "2026-09-29" },
  HOD_SIGNOFF_PENDING: { openFrom: "2026-09-18", dueOn: "2026-09-29" },
};

let slaStages = { ...FALLBACK_SLA };

export function invalidateSlaCache() {
  // Will be refreshed on next refreshSlaCache / save
  slaStages = { ...FALLBACK_SLA };
}

export async function refreshSlaCache() {
  try {
    const campaign = await getSlaCampaign();
    slaStages = campaign.stages || { ...FALLBACK_SLA };
  } catch {
    slaStages = { ...FALLBACK_SLA };
  }
  return slaStages;
}

export function getSlaStages() {
  return slaStages;
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseCampaignDate(yyyyMmDd) {
  const [year, month, day] = String(yyyyMmDd).split("-").map(Number);
  return startOfDay(new Date(year, month - 1, day));
}

export function addWorkingDays(from, days) {
  const date = startOfDay(new Date(from));
  let remaining = days;
  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    if (!isWeekend(date)) remaining -= 1;
  }
  return date;
}

export function workingDaysBetween(start, end) {
  const a = startOfDay(new Date(start));
  const b = startOfDay(new Date(end));
  if (a.getTime() === b.getTime()) return 0;
  const forward = b > a;
  const cursor = new Date(forward ? a : b);
  const target = forward ? b : a;
  let count = 0;
  while (cursor < target) {
    cursor.setDate(cursor.getDate() + 1);
    if (!isWeekend(cursor)) count += 1;
  }
  return forward ? count : -count;
}

export function computeSlaStatus(dueAt, completedAt, reference = new Date()) {
  if (completedAt) return "COMPLETED";
  if (!dueAt) return "ON_TRACK";
  const due = startOfDay(new Date(dueAt));
  const today = startOfDay(reference);
  if (today > due) return "BREACHED";
  const remaining = workingDaysBetween(today, due);
  if (remaining <= 1) return "DUE_SOON";
  return "ON_TRACK";
}

export function computeAgeingDays(assignedAt, completedAt, reference = new Date()) {
  if (!assignedAt) return 0;
  const end = completedAt ? new Date(completedAt) : reference;
  return Math.max(0, workingDaysBetween(assignedAt, end));
}

export function buildDueDate(assignedAt, stage) {
  const dueOn = slaStages[stage]?.dueOn;
  if (dueOn) return parseCampaignDate(dueOn).toISOString();
  return addWorkingDays(assignedAt, 3).toISOString();
}

export function normalizeSla(sla, stageFallback) {
  if (!sla && !stageFallback) return null;
  const stage = sla?.stage || stageFallback || "";
  const assignedAt = sla?.assignedAt || nowIso();
  const dueAt = buildDueDate(assignedAt, stage);
  const completedAt = sla?.completedAt ?? null;
  return {
    stage,
    assignedAt,
    dueAt,
    completedAt,
    slaStatus: computeSlaStatus(dueAt, completedAt),
    ageingDays: computeAgeingDays(assignedAt, completedAt),
  };
}

export function nowIso() {
  return new Date().toISOString();
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

export { FALLBACK_SLA as SLA_CONFIG };
