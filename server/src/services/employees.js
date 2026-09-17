import { getPool } from "../db.js";
import { mapAppRole } from "../utils/roles.js";
import { parsePayload, serializeUser } from "./userMaster.js";

export function employeeFromUserRow(row, lookups = {}) {
  const user = serializeUser(row);
  const payload = user.payload || parsePayload(row.payload);
  const supervisorEmail = String(payload.supervisor_email || "").trim().toLowerCase();
  const supervisorCode = String(payload.supervisor_employee_code || "").trim();
  const hodEmail = String(payload.l2_manager_email || "").trim().toLowerCase();
  const hodCode = String(payload.l2_manager_employee_code || "").trim();

  return {
    id: user.id,
    empId: user.employeeCode || payload.adrenalin_employee_id || user.id,
    name: user.name,
    company: user.company || payload.company || "",
    businessUnit: payload.business_line || user.company || "",
    functionName: user.department || payload.department || "",
    department: user.department || payload.department || "",
    designation: user.designation || payload.designation || "",
    grade: payload.grade || "",
    location: user.location || payload.office_location || payload.location || "",
    dateOfJoining: user.dateOfJoining || payload.joining_date || "",
    managerId:
      lookups.byEmail?.get(supervisorEmail) ||
      lookups.byCode?.get(supervisorCode) ||
      null,
    hodId: lookups.byEmail?.get(hodEmail) || lookups.byCode?.get(hodCode) || null,
    hrbpId: null,
    email: user.email || "",
  };
}

export function serializeEmployee(row) {
  return {
    id: row.id,
    empId: row.emp_id,
    name: row.name,
    company: row.company || "",
    businessUnit: row.business_unit || "",
    functionName: row.function_name || "",
    department: row.department || "",
    designation: row.designation || "",
    grade: row.grade || "",
    location: row.location || "",
    dateOfJoining: row.date_of_joining || "",
    managerId: row.manager_id,
    hodId: row.hod_id,
    hrbpId: row.hrbp_id,
    email: row.email || "",
  };
}

export async function syncEmployeesFromUsers() {
  const db = await getPool();
  const [rows] = await db.query("SELECT * FROM users");
  const byEmail = new Map();
  const byCode = new Map();
  for (const row of rows) {
    const user = serializeUser(row);
    if (user.email) byEmail.set(user.email.toLowerCase(), user.id);
    if (user.employeeCode) byCode.set(String(user.employeeCode), user.id);
    const payload = user.payload || {};
    if (payload.adrenalin_employee_id) {
      byCode.set(String(payload.adrenalin_employee_id), user.id);
    }
  }

  const employees = rows.map((row) => employeeFromUserRow(row, { byEmail, byCode }));
  if (!employees.length) return { count: 0 };

  const sql = `
    INSERT INTO employees (
      id, emp_id, name, email, company, business_unit, function_name, department,
      designation, grade, location, date_of_joining, manager_id, hod_id, hrbp_id
    ) VALUES ?
    ON DUPLICATE KEY UPDATE
      emp_id = VALUES(emp_id),
      name = VALUES(name),
      email = VALUES(email),
      company = VALUES(company),
      business_unit = VALUES(business_unit),
      function_name = VALUES(function_name),
      department = VALUES(department),
      designation = VALUES(designation),
      grade = VALUES(grade),
      location = VALUES(location),
      date_of_joining = VALUES(date_of_joining),
      manager_id = VALUES(manager_id),
      hod_id = COALESCE(employees.hod_id, VALUES(hod_id)),
      hrbp_id = COALESCE(employees.hrbp_id, VALUES(hrbp_id))
  `;

  const values = employees.map((e) => [
    e.id,
    e.empId,
    e.name,
    e.email,
    e.company,
    e.businessUnit,
    e.functionName,
    e.department,
    e.designation,
    e.grade,
    e.location,
    e.dateOfJoining,
    e.managerId,
    e.hodId,
    e.hrbpId,
  ]);

  for (let i = 0; i < values.length; i += 150) {
    await db.query(sql, [values.slice(i, i + 150)]);
  }

  return { count: employees.length };
}

export async function listEmployees() {
  const db = await getPool();
  const [rows] = await db.query("SELECT * FROM employees ORDER BY name ASC");
  return rows.map(serializeEmployee);
}

export async function listEmployeesFor(auth, assessments = []) {
  if (auth.role === "ADMIN") return listEmployees();
  const ids = new Set();
  const self = auth.user?.employeeId || auth.user?.id;
  if (self) ids.add(self);
  for (const assessment of assessments) {
    if (assessment.employeeId) ids.add(assessment.employeeId);
    if (assessment.managerId) ids.add(assessment.managerId);
    if (assessment.hodId) ids.add(assessment.hodId);
    if (assessment.hrbpId) ids.add(assessment.hrbpId);
  }
  const db = await getPool();
  if (self) {
    const [reports] = await db.query("SELECT id FROM employees WHERE manager_id = ?", [
      self,
    ]);
    for (const row of reports) ids.add(row.id);
  }
  if (!ids.size) return [];
  const list = [...ids];
  const [rows] = await db.query(
    `SELECT * FROM employees WHERE id IN (${list.map(() => "?").join(",")}) ORDER BY name ASC`,
    list,
  );
  return rows.map(serializeEmployee);
}

export async function getEmployee(id) {
  const db = await getPool();
  const [rows] = await db.query("SELECT * FROM employees WHERE id = ? LIMIT 1", [id]);
  return rows[0] ? serializeEmployee(rows[0]) : null;
}

async function buildUserLookups() {
  const db = await getPool();
  const [rows] = await db.query(
    "SELECT id, employee_code, email, payload FROM users",
  );
  const byCode = new Map();
  for (const row of rows) {
    if (row.employee_code) byCode.set(String(row.employee_code).trim().toUpperCase(), row.id);
    const payload = parsePayload(row.payload);
    if (payload.adrenalin_employee_id) {
      byCode.set(String(payload.adrenalin_employee_id).trim().toUpperCase(), row.id);
    }
  }
  return { byCode };
}

async function syncAssessmentHierarchy(employeeId, hodId, hrbpId) {
  const db = await getPool();
  const [rows] = await db.query(
    "SELECT id, data FROM assessments WHERE employee_id = ?",
    [employeeId],
  );
  for (const row of rows) {
    let data = row.data;
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        data = {};
      }
    }
    if (!data || typeof data !== "object") data = {};
    data.hodId = hodId;
    data.hrbpId = hrbpId;
    data.updatedAt = new Date().toISOString();
    await db.query(
      `UPDATE assessments
       SET hod_id = ?, hrbp_id = ?, data = ?, updated_at = NOW()
       WHERE id = ?`,
      [hodId, hrbpId, JSON.stringify(data), row.id],
    );
  }
}

/**
 * Update HOD / HRBP for one employee (manager / L1 is not changed).
 * @param {string} id employee UUID
 * @param {{ hodId?: string | null, hrbpId?: string | null }} patch
 */
export async function updateEmployeeHierarchy(id, patch) {
  const employee = await getEmployee(id);
  if (!employee) return null;

  const hodId = Object.prototype.hasOwnProperty.call(patch, "hodId")
    ? patch.hodId || null
    : employee.hodId;
  const hrbpId = Object.prototype.hasOwnProperty.call(patch, "hrbpId")
    ? patch.hrbpId || null
    : employee.hrbpId;

  const db = await getPool();
  await db.query("UPDATE employees SET hod_id = ?, hrbp_id = ? WHERE id = ?", [
    hodId,
    hrbpId,
    id,
  ]);
  await syncAssessmentHierarchy(id, hodId, hrbpId);
  return getEmployee(id);
}

/**
 * Bulk-update HOD / HRBP from Excel rows keyed by employee code.
 * Ignores L1 / manager. Resolves codes via user master employee_code.
 * @param {Array<{ empId: string, hodCode?: string | null, hrbpCode?: string | null }>} rows
 */
export async function importEmployeeHierarchy(rows) {
  const { byCode } = await buildUserLookups();
  const db = await getPool();
  const [employees] = await db.query("SELECT id, emp_id, hod_id, hrbp_id FROM employees");
  const byEmpId = new Map(
    employees.map((row) => [String(row.emp_id || "").trim().toUpperCase(), row]),
  );

  const summary = {
    total: rows.length,
    updated: 0,
    skipped: 0,
    notFound: [],
    unresolvedHod: [],
    unresolvedHrbp: [],
  };

  for (const row of rows) {
    const empKey = String(row.empId || "").trim().toUpperCase();
    if (!empKey) {
      summary.skipped += 1;
      continue;
    }
    const employee = byEmpId.get(empKey);
    if (!employee) {
      summary.notFound.push(row.empId);
      continue;
    }

    let hodId = employee.hod_id;
    let hrbpId = employee.hrbp_id;
    let changed = false;

    if (row.hodCode != null && String(row.hodCode).trim() !== "") {
      const resolved = byCode.get(String(row.hodCode).trim().toUpperCase());
      if (!resolved) {
        summary.unresolvedHod.push({ empId: row.empId, code: row.hodCode });
      } else if (resolved !== hodId) {
        hodId = resolved;
        changed = true;
      }
    }

    if (row.hrbpCode != null && String(row.hrbpCode).trim() !== "") {
      const resolved = byCode.get(String(row.hrbpCode).trim().toUpperCase());
      if (!resolved) {
        summary.unresolvedHrbp.push({ empId: row.empId, code: row.hrbpCode });
      } else if (resolved !== hrbpId) {
        hrbpId = resolved;
        changed = true;
      }
    }

    if (!changed) {
      summary.skipped += 1;
      continue;
    }

    await db.query("UPDATE employees SET hod_id = ?, hrbp_id = ? WHERE id = ?", [
      hodId,
      hrbpId,
      employee.id,
    ]);
    await syncAssessmentHierarchy(employee.id, hodId, hrbpId);
    summary.updated += 1;
  }

  return summary;
}

export async function countDirectReports(managerId) {
  const db = await getPool();
  const [[{ total }]] = await db.query(
    "SELECT COUNT(*) AS total FROM employees WHERE manager_id = ?",
    [managerId],
  );
  return Number(total) || 0;
}

export async function countHodAssignments(hodId) {
  const db = await getPool();
  const [[{ total }]] = await db.query(
    "SELECT COUNT(*) AS total FROM employees WHERE hod_id = ?",
    [hodId],
  );
  return Number(total) || 0;
}

export async function resolveSessionRole(record) {
  let role = mapAppRole(record);
  const reports = await countDirectReports(record.id);
  if (reports > 0 && role === "EMPLOYEE") role = "REPORTING_MANAGER";
  const hodCount = await countHodAssignments(record.id);
  if (hodCount > 0 && role !== "ADMIN" && role !== "HRBP") role = "HOD";
  return role;
}
