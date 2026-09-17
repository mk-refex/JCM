import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getAssessmentFor,
  homePathFor,
  listAssessmentsFor,
  listAudit,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  dispatchSlaReminders,
  runAlignment,
  runAlignmentConversation,
  runHodSignoff,
  runInitialClarity,
  runManagerDraft,
  runManagerSubmit,
  runSelfDraft,
  runSelfSubmit,
} from "../services/assessments.js";
import { getEmployee, listEmployeesFor } from "../services/employees.js";

const router = Router();
router.use(requireAuth);

router.get("/workspace", async (req, res) => {
  const assessments = await listAssessmentsFor(req.auth);
  const [employees, notifications] = await Promise.all([
    listEmployeesFor(req.auth, assessments),
    listNotifications(req.auth),
  ]);
  const employee = await getEmployee(req.auth.user.employeeId || req.auth.user.id);
  return res.json({
    user: req.auth.user,
    employee,
    employees,
    assessments,
    notifications,
    redirectTo: homePathFor(req.auth, assessments),
  });
});

router.get("/", async (req, res) => {
  const assessments = await listAssessmentsFor(req.auth);
  return res.json({ assessments });
});

router.get("/notifications", async (req, res) => {
  const notifications = await listNotifications(req.auth);
  return res.json({ notifications });
});

router.post("/notifications/read-all", async (req, res) => {
  await markAllNotificationsRead(req.auth);
  return res.json({ ok: true });
});

router.post("/notifications/:id/read", async (req, res) => {
  await markNotificationRead(req.auth, req.params.id);
  return res.json({ ok: true });
});

router.post("/reminders/dispatch", async (req, res) => {
  if (req.auth.role !== "ADMIN") {
    return res.status(403).json({ message: "Only HR Admin can dispatch reminders." });
  }
  const result = await dispatchSlaReminders();
  return res.json(result);
});

router.get("/:id/audit", async (req, res) => {
  const assessment = await getAssessmentFor(req.auth, req.params.id);
  if (!assessment) return res.status(404).json({ message: "Assessment not found." });
  const auditLogs = await listAudit(req.params.id);
  return res.json({ auditLogs });
});

router.get("/:id", async (req, res) => {
  const assessment = await getAssessmentFor(req.auth, req.params.id);
  if (!assessment) return res.status(404).json({ message: "Assessment not found." });
  return res.json({ assessment });
});

router.post("/:id/initial-clarity", async (req, res) => {
  const result = await runInitialClarity(req.auth, req.params.id, req.body?.response);
  if (result.error) return res.status(result.status || 400).json({ message: result.error });
  return res.json(result);
});

router.post("/:id/self-draft", async (req, res) => {
  const result = await runSelfDraft(req.auth, req.params.id, req.body || {});
  if (result.error) return res.status(result.status || 400).json({ message: result.error });
  return res.json(result);
});

router.post("/:id/self-submit", async (req, res) => {
  const result = await runSelfSubmit(req.auth, req.params.id, req.body || {});
  if (result.error) return res.status(result.status || 400).json({ message: result.error });
  return res.json(result);
});

router.post("/:id/manager-draft", async (req, res) => {
  const result = await runManagerDraft(req.auth, req.params.id, req.body || {});
  if (result.error) return res.status(result.status || 400).json({ message: result.error });
  return res.json(result);
});

router.post("/:id/manager-submit", async (req, res) => {
  const result = await runManagerSubmit(req.auth, req.params.id, req.body || {});
  if (result.error) return res.status(result.status || 400).json({ message: result.error });
  return res.json(result);
});

router.post("/:id/alignment", async (req, res) => {
  const result = await runAlignment(req.auth, req.params.id, req.body?.decision);
  if (result.error) return res.status(result.status || 400).json({ message: result.error });
  return res.json(result);
});

router.post("/:id/alignment-conversation", async (req, res) => {
  const result = await runAlignmentConversation(req.auth, req.params.id, req.body || {});
  if (result.error) return res.status(result.status || 400).json({ message: result.error });
  return res.json(result);
});

router.post("/:id/hod-signoff", async (req, res) => {
  const result = await runHodSignoff(req.auth, req.params.id, req.body?.comments);
  if (result.error) return res.status(result.status || 400).json({ message: result.error });
  return res.json(result);
});

export default router;
