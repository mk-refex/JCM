import { SLA_CONFIG, type SlaStageConfig } from "@/constants/clarity";
import type { SlaRecord, SlaStatus } from "@/types/domain";

let runtimeStages: Record<string, SlaStageConfig> = { ...SLA_CONFIG };

export function setRuntimeSlaStages(
  stages: Record<string, Partial<SlaStageConfig>> | null | undefined,
) {
  const next: Record<string, SlaStageConfig> = { ...SLA_CONFIG };
  if (stages) {
    for (const [key, defaults] of Object.entries(SLA_CONFIG)) {
      const row = stages[key] || {};
      next[key] = {
        label: defaults.label,
        owner: defaults.owner,
        openFrom: row.openFrom || defaults.openFrom,
        dueOn: row.dueOn || defaults.dueOn,
      };
    }
  }
  runtimeStages = next;
}

export function getRuntimeSlaStages() {
  return runtimeStages;
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Parse a campaign calendar date (YYYY-MM-DD) as local start of day. */
export function parseCampaignDate(yyyyMmDd: string): Date {
  const [year, month, day] = yyyyMmDd.split("-").map(Number);
  return startOfDay(new Date(year, month - 1, day));
}

/** Add N working days (Mon–Fri) to a date. */
export function addWorkingDays(from: Date | string, days: number): Date {
  const date = startOfDay(new Date(from));
  let remaining = days;
  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    if (!isWeekend(date)) remaining -= 1;
  }
  return date;
}

/** Working days between two dates (exclusive of start, inclusive of end). */
export function workingDaysBetween(
  start: Date | string,
  end: Date | string,
): number {
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

export function slaDueOnForStage(stage: string): string | null {
  return runtimeStages[stage]?.dueOn ?? null;
}

export function slaOpenFromForStage(stage: string): string | null {
  return runtimeStages[stage]?.openFrom ?? null;
}

export function computeSlaStatus(
  dueAt: string | null,
  completedAt: string | null,
  reference: Date = new Date(),
): SlaStatus {
  if (completedAt) return "COMPLETED";
  if (!dueAt) return "ON_TRACK";
  const due = startOfDay(new Date(dueAt));
  const today = startOfDay(reference);
  if (today > due) return "BREACHED";
  const remaining = workingDaysBetween(today, due);
  if (remaining <= 1) return "DUE_SOON";
  return "ON_TRACK";
}

export function computeAgeingDays(
  assignedAt: string | null,
  completedAt: string | null,
  reference: Date = new Date(),
): number {
  if (!assignedAt) return 0;
  const end = completedAt ? new Date(completedAt) : reference;
  return Math.max(0, workingDaysBetween(assignedAt, end));
}

/** Fixed campaign due date for a stage (falls back to +3 working days). */
export function buildDueDate(assignedAt: string, stage: string): string {
  const dueOn = slaDueOnForStage(stage);
  if (dueOn) return parseCampaignDate(dueOn).toISOString();
  return addWorkingDays(assignedAt, 3).toISOString();
}

/** Keep stored SLA records aligned with the fixed campaign calendar. */
export function normalizeSla(
  sla: SlaRecord | null | undefined,
  stageFallback?: string,
): SlaRecord | null {
  if (!sla && !stageFallback) return null;
  const stage = sla?.stage || stageFallback || "";
  const assignedAt = sla?.assignedAt ?? new Date().toISOString();
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
