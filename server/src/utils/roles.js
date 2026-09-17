const ROLES = ["EMPLOYEE", "REPORTING_MANAGER", "HOD", "HRBP", "ADMIN"];

export function mapAppRole(user = {}) {
  const hay = `${user.role || ""} ${user.designation || ""} ${user.title || ""}`.toLowerCase();

  // JCM ADMIN is only the dedicated admin login, never a RefexOne access role
  // such as org_admin. Those people still follow employee/manager/HOD mapping.
  if (/\bhrbp\b|hr business partner/.test(hay)) return "HRBP";
  if (/\bhod\b|head of department|department head/.test(hay)) return "HOD";
  if (/reporting\s*manager|\bmanager\b|\blead\b/.test(hay)) return "REPORTING_MANAGER";
  return "EMPLOYEE";
}

export function isAppRole(value) {
  return ROLES.includes(value);
}
