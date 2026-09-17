import { SLA_CONFIG } from "@/constants/clarity";
import type { SlaStatus } from "@/types/domain";

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
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

export function slaDaysForStage(stage: string): number {
  return SLA_CONFIG[stage]?.days ?? 3;
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

export function buildDueDate(assignedAt: string, stage: string): string {
  return addWorkingDays(assignedAt, slaDaysForStage(stage)).toISOString();
}