import { CLARITY_DIMENSIONS, RAG_RULES } from "@/constants/clarity";
import type {
  DimensionGap,
  DimensionRating,
  RagStatus,
} from "@/types/domain";

export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function averageOf(scores: Array<number | null | undefined>): number | null {
  const valid = scores.filter(
    (s): s is number => typeof s === "number" && !Number.isNaN(s),
  );
  if (!valid.length) return null;
  return round(valid.reduce((a, b) => a + b, 0) / valid.length, 2);
}

export function ratingMap(ratings: DimensionRating[]) {
  const map: Record<string, number | null> = {};
  ratings.forEach((r) => {
    map[r.dimensionKey] = r.score;
  });
  return map;
}

export function employeeAverage(ratings: DimensionRating[]): number | null {
  const map = ratingMap(ratings);
  return averageOf(CLARITY_DIMENSIONS.map((d) => map[d.key] ?? null));
}

export function managerAverage(ratings: DimensionRating[]): number | null {
  return employeeAverage(ratings);
}

export function buildDimensionGaps(
  employeeRatings: DimensionRating[],
  managerRatings: DimensionRating[],
): DimensionGap[] {
  const emp = ratingMap(employeeRatings);
  const mgr = ratingMap(managerRatings);
  return CLARITY_DIMENSIONS.map((d) => {
    const e = emp[d.key] ?? null;
    const m = mgr[d.key] ?? null;
    const gap = e !== null && m !== null ? round(m - e, 2) : null;
    return {
      dimensionKey: d.key,
      name: d.name,
      shortName: d.shortName,
      employeeScore: e,
      managerScore: m,
      gap,
    };
  });
}

export function overallGapOf(
  employeeOverall: number | null,
  managerOverall: number | null,
): number | null {
  if (employeeOverall === null || managerOverall === null) return null;
  return round(managerOverall - employeeOverall, 2);
}

/**
 * RAG is derived from the assessor's overall average (Manager Assessment)
 * combined with the absolute overall gap — matching the workbook rule.
 */
export function computeRag(
  overallAverage: number | null,
  overallGap: number | null,
): RagStatus | null {
  if (overallAverage === null || overallGap === null) return null;
  const absGap = Math.abs(overallGap);
  if (
    overallAverage >= RAG_RULES.greenMinAverage &&
    absGap <= RAG_RULES.greenMaxAbsGap
  ) {
    return "GREEN";
  }
  if (
    overallAverage < RAG_RULES.redMaxAverage ||
    absGap >= RAG_RULES.redMinAbsGap
  ) {
    return "RED";
  }
  return "AMBER";
}

export function completenessForRatings(ratings: DimensionRating[]): number {
  const map = ratingMap(ratings);
  const answered = CLARITY_DIMENSIONS.filter(
    (d) => typeof map[d.key] === "number",
  ).length;
  return Math.round((answered / CLARITY_DIMENSIONS.length) * 100);
}

export function gapTone(gap: number | null): string {
  if (gap === null) return "text-foreground-400";
  const abs = Math.abs(gap);
  if (abs <= 1) return "text-primary-700";
  if (abs === 2) return "text-accent-700";
  return "text-foreground-950";
}