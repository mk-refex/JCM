import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import {
  getEmployee,
  importEmployeeHierarchy,
  listEmployeesFor,
  updateEmployeeHierarchy,
} from "../services/employees.js";
import { listAssessmentsFor } from "../services/assessments.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const assessments = await listAssessmentsFor(req.auth);
  const employees = await listEmployeesFor(req.auth, assessments);
  return res.json({ employees });
});

router.get("/me", async (req, res) => {
  const id = req.auth.user.employeeId || req.auth.user.id;
  const employee = await getEmployee(id);
  if (!employee) return res.status(404).json({ message: "Employee profile not found." });
  return res.json({ employee });
});

router.post("/import-hierarchy", requireAdmin, async (req, res) => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : null;
  if (!rows?.length) {
    return res.status(400).json({ message: "Provide rows with empId, hodCode, and/or hrbpCode." });
  }
  const normalized = rows.map((row) => ({
    empId: String(row.empId || row.employeeId || row["Employee ID"] || "").trim(),
    hodCode:
      row.hodCode != null || row.hod != null || row.HOD != null
        ? String(row.hodCode ?? row.hod ?? row.HOD).trim()
        : null,
    hrbpCode:
      row.hrbpCode != null || row.hrbp != null || row.HRBP != null
        ? String(row.hrbpCode ?? row.hrbp ?? row.HRBP).trim()
        : null,
  }));
  const summary = await importEmployeeHierarchy(normalized);
  return res.json({ message: "Hierarchy import completed.", ...summary });
});

router.patch("/:id/hierarchy", requireAdmin, async (req, res) => {
  const patch = {};
  if (Object.prototype.hasOwnProperty.call(req.body || {}, "hodId")) {
    patch.hodId = req.body.hodId ? String(req.body.hodId) : null;
  }
  if (Object.prototype.hasOwnProperty.call(req.body || {}, "hrbpId")) {
    patch.hrbpId = req.body.hrbpId ? String(req.body.hrbpId) : null;
  }
  if (!Object.keys(patch).length) {
    return res.status(400).json({ message: "Provide hodId and/or hrbpId to update." });
  }
  const employee = await updateEmployeeHierarchy(req.params.id, patch);
  if (!employee) return res.status(404).json({ message: "Employee not found." });
  return res.json({ employee });
});

router.get("/:id", async (req, res) => {
  const employee = await getEmployee(req.params.id);
  if (!employee) return res.status(404).json({ message: "Employee not found." });
  if (req.auth.role !== "ADMIN") {
    const self = req.auth.user.employeeId || req.auth.user.id;
    const related =
      employee.id === self ||
      employee.managerId === self ||
      employee.hodId === self ||
      employee.hrbpId === self;
    if (!related) {
      const assessments = await listAssessmentsFor(req.auth);
      const visible = new Set(
        assessments.flatMap((item) => [
          item.employeeId,
          item.managerId,
          item.hodId,
          item.hrbpId,
        ]),
      );
      if (!visible.has(employee.id)) {
        return res.status(403).json({ message: "You cannot view this employee." });
      }
    }
  }
  return res.json({ employee });
});

export default router;
