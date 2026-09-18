import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import {
  getInitialCheckDigest,
  getSlaCampaign,
  saveInitialCheckDigest,
  saveSlaCampaign,
} from "../services/settings.js";
import { dispatchInitialCheckDigest } from "../services/initialCheckDigest.js";

const router = Router();

/** Authenticated users need SLA dates for due badges. */
router.get("/sla", requireAuth, async (_req, res) => {
  try {
    const sla = await getSlaCampaign();
    return res.json(sla);
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to load SLA settings.",
    });
  }
});

router.put("/sla", requireAdmin, async (req, res) => {
  try {
    const sla = await saveSlaCampaign(req.body || {});
    return res.json(sla);
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to save SLA settings.",
    });
  }
});

router.get("/initial-check-digest", requireAdmin, async (_req, res) => {
  try {
    const digest = await getInitialCheckDigest();
    return res.json(digest);
  } catch (error) {
    return res.status(500).json({
      message:
        error instanceof Error ? error.message : "Failed to load digest settings.",
    });
  }
});

router.put("/initial-check-digest", requireAdmin, async (req, res) => {
  try {
    const digest = await saveInitialCheckDigest(req.body || {});
    return res.json(digest);
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error ? error.message : "Failed to save digest settings.",
    });
  }
});

router.post("/initial-check-digest/dispatch", requireAdmin, async (_req, res) => {
  try {
    const result = await dispatchInitialCheckDigest({ trigger: "manual" });
    return res.json(result);
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error ? error.message : "Failed to send digest reminder.",
    });
  }
});

export default router;
