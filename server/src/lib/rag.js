export const RAG_RULES = {
  greenMinAverage: 4.0,
  greenMaxAbsGap: 1,
  redMaxAverage: 3.0,
  redMinAbsGap: 3,
};

export const CLARITY_DIMENSIONS = [
  { key: "rolePurpose" },
  { key: "responsibilities" },
  { key: "reportingRelationships" },
  { key: "decisionAuthority" },
  { key: "successMetrics" },
  { key: "stakeholders" },
  { key: "growthPath" },
];

export function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function averageOf(scores) {
  const valid = scores.filter((s) => typeof s === "number" && !Number.isNaN(s));
  if (!valid.length) return null;
  return round(valid.reduce((a, b) => a + b, 0) / valid.length, 2);
}

export function ratingMap(ratings = []) {
  const map = {};
  ratings.forEach((r) => {
    map[r.dimensionKey] = r.score;
  });
  return map;
}

export function employeeAverage(ratings) {
  const map = ratingMap(ratings);
  return averageOf(CLARITY_DIMENSIONS.map((d) => map[d.key] ?? null));
}

export function managerAverage(ratings) {
  return employeeAverage(ratings);
}

export function overallGapOf(employeeOverall, managerOverall) {
  if (employeeOverall === null || managerOverall === null) return null;
  return round(managerOverall - employeeOverall, 2);
}

export function computeRag(overallAverage, overallGap) {
  if (overallAverage === null || overallGap === null) return null;
  const absGap = Math.abs(overallGap);
  if (overallAverage >= RAG_RULES.greenMinAverage && absGap <= RAG_RULES.greenMaxAbsGap) {
    return "GREEN";
  }
  if (overallAverage < RAG_RULES.redMaxAverage || absGap >= RAG_RULES.redMinAbsGap) {
    return "RED";
  }
  return "AMBER";
}
