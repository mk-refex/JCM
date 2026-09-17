const SLA_CONFIG = {
  SELF_ASSESSMENT_PENDING: { days: 3 },
  MANAGER_ASSESSMENT_PENDING: { days: 3 },
  EMPLOYEE_ALIGNMENT_PENDING: { days: 2 },
  ROLE_ALIGNMENT_REQUIRED: { days: 3 },
  ROLE_ALIGNMENT_IN_PROGRESS: { days: 3 },
  HOD_SIGNOFF_PENDING: { days: 2 },
  INITIAL_CLARITY_CHECK: { days: 1 },
};

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
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

export function buildDueDate(assignedAt, stage) {
  return addWorkingDays(assignedAt, SLA_CONFIG[stage]?.days ?? 3).toISOString();
}

export function nowIso() {
  return new Date().toISOString();
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}
