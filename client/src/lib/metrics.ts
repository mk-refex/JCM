import { CLARITY_DIMENSIONS } from "@/constants/clarity";
import {
  averageOf,
  buildDimensionGaps,
  computeRag,
  employeeAverage,
  managerAverage,
  overallGapOf,
  round,
} from "@/lib/rag";
import { computeAgeingDays, computeSlaStatus, normalizeSla } from "@/lib/sla";
import type { Assessment, Employee, RagStatus, SlaStatus } from "@/types/domain";

export function effectiveSla(a: Assessment): SlaStatus {
  if (a.completedAt) return "COMPLETED";
  const sla = normalizeSla(a.sla, a.status);
  return computeSlaStatus(sla?.dueAt ?? null, null);
}

export function effectiveAgeing(a: Assessment): number {
  const sla = normalizeSla(a.sla, a.status);
  return computeAgeingDays(
    sla?.assignedAt ?? a.sla.assignedAt,
    a.completedAt ?? sla?.completedAt ?? a.sla.completedAt,
  );
}

export function derivedEmployeeAverage(a: Assessment): number | null {
  return a.employeeOverallAverage ?? employeeAverage(a.employeeRatings);
}

export function derivedManagerAverage(a: Assessment): number | null {
  return a.managerOverallAverage ?? managerAverage(a.managerRatings);
}

export function derivedGap(a: Assessment): number | null {
  return (
    a.overallGap ??
    overallGapOf(derivedEmployeeAverage(a), derivedManagerAverage(a))
  );
}

export function derivedRag(a: Assessment): RagStatus | null {
  if (a.ragStatus) return a.ragStatus;
  return computeRag(derivedManagerAverage(a), derivedGap(a));
}

export interface DimensionTrendRow {
  key: string;
  name: string;
  shortName: string;
  employee: number | null;
  manager: number | null;
  gap: number | null;
}

export interface BusinessUnitRow {
  name: string;
  total: number;
  completed: number;
  green: number;
  amber: number;
  red: number;
  avgGap: number | null;
}

export interface Metrics {
  total: number;
  open: number;
  completed: number;
  aligned: number;
  notAligned: number;
  breached: number;
  dueSoon: number;
  onTrack: number;
  avgEmployee: number | null;
  avgManager: number | null;
  avgGap: number | null;
  rag: Record<RagStatus, number>;
  ragUnknown: number;
  dimensionTrend: DimensionTrendRow[];
  businessUnitRows: BusinessUnitRow[];
  functionRows: BusinessUnitRow[];
}

function groupRows(
  list: Assessment[],
  employeeById: (id?: string | null) => Employee | undefined,
  pick: (e: Employee) => string,
): BusinessUnitRow[] {
  const map = new Map<string, BusinessUnitRow>();
  list.forEach((a) => {
    const emp = employeeById(a.employeeId);
    if (!emp) return;
    const name = pick(emp);
    if (!map.has(name)) {
      map.set(name, {
        name,
        total: 0,
        completed: 0,
        green: 0,
        amber: 0,
        red: 0,
        avgGap: null,
      });
    }
    const row = map.get(name)!;
    row.total += 1;
    if (a.status === "COMPLETED") row.completed += 1;
    const rag = derivedRag(a);
    if (rag === "GREEN") row.green += 1;
    else if (rag === "AMBER") row.amber += 1;
    else if (rag === "RED") row.red += 1;
  });

  return Array.from(map.values())
    .map((row) => {
      const gaps = list
        .filter((a) => {
          const emp = employeeById(a.employeeId);
          return emp ? pick(emp) === row.name : false;
        })
        .map((a) => derivedGap(a))
        .filter((g): g is number => g !== null);
      return {
        ...row,
        avgGap: gaps.length ? round(gaps.reduce((x, y) => x + y, 0) / gaps.length, 2) : null,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function computeMetrics(
  list: Assessment[],
  employeeById: (id?: string | null) => Employee | undefined,
): Metrics {
  const total = list.length;
  const completed = list.filter((a) => a.status === "COMPLETED").length;
  const aligned = list.filter((a) => a.alignmentStatus === "ALIGNED").length;
  const notAligned = list.filter(
    (a) => a.alignmentStatus === "NOT_ALIGNED",
  ).length;

  const slaValues = list.map(effectiveSla);
  const breached = slaValues.filter((s) => s === "BREACHED").length;
  const dueSoon = slaValues.filter((s) => s === "DUE_SOON").length;
  const onTrack = slaValues.filter((s) => s === "ON_TRACK").length;

  const empAverages = list
    .map(derivedEmployeeAverage)
    .filter((v): v is number => v !== null);
  const mgrAverages = list
    .map(derivedManagerAverage)
    .filter((v): v is number => v !== null);
  const gaps = list
    .map(derivedGap)
    .filter((v): v is number => v !== null);

  const rag: Record<RagStatus, number> = { GREEN: 0, AMBER: 0, RED: 0 };
  let ragUnknown = 0;
  list.forEach((a) => {
    const value = derivedRag(a);
    if (value) rag[value] += 1;
    else ragUnknown += 1;
  });

  const dimensionTrend: DimensionTrendRow[] = CLARITY_DIMENSIONS.map((d) => {
    const empScores: number[] = [];
    const mgrScores: number[] = [];
    list.forEach((a) => {
      const gapsForA = buildDimensionGaps(a.employeeRatings, a.managerRatings);
      const row = gapsForA.find((g) => g.dimensionKey === d.key);
      if (!row) return;
      if (row.employeeScore !== null) empScores.push(row.employeeScore);
      if (row.managerScore !== null) mgrScores.push(row.managerScore);
    });
    const employee = averageOf(empScores);
    const manager = averageOf(mgrScores);
    return {
      key: d.key,
      name: d.name,
      shortName: d.shortName,
      employee,
      manager,
      gap: employee !== null && manager !== null ? round(manager - employee, 2) : null,
    };
  });

  return {
    total,
    open: total - completed,
    completed,
    aligned,
    notAligned,
    breached,
    dueSoon,
    onTrack,
    avgEmployee: averageOf(empAverages),
    avgManager: averageOf(mgrAverages),
    avgGap: averageOf(gaps),
    rag,
    ragUnknown,
    dimensionTrend,
    businessUnitRows: groupRows(list, employeeById, (e) => e.businessUnit),
    functionRows: groupRows(list, employeeById, (e) => e.functionName),
  };
}

export function scoreLabel(value: number | null): string {
  if (value === null) return "—";
  return value.toFixed(2);
}