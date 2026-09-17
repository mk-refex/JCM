import { Router } from "express";
import { getPool } from "../db.js";
import { requireAdmin } from "../middleware/auth.js";
import {
  recordSyncError,
  serializeUser,
  syncUsersFromMaster,
} from "../services/userMaster.js";
import { flattenRecord } from "../utils/mapUser.js";

const router = Router();
router.use(requireAdmin);

async function getSyncMeta(db) {
  const [rows] = await db.query(
    "SELECT last_synced_at, last_count, last_error FROM sync_meta WHERE source = 'user-master' LIMIT 1",
  );
  return rows[0] || { last_synced_at: null, last_count: 0, last_error: null };
}

router.post("/sync", async (_req, res) => {
  try {
    const result = await syncUsersFromMaster();
    return res.json({
      message: `Synced ${result.count} users from RefexOne.`,
      count: result.count,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "User sync failed.";
    await recordSyncError(message);
    return res.status(502).json({ message });
  }
});

router.get("/", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(20000, Math.max(10, Number(req.query.limit) || 5000));
  const offset = (page - 1) * limit;
  const db = await getPool();

  const where = q
    ? `WHERE name LIKE ? OR email LIKE ? OR employee_code LIKE ? OR department LIKE ? OR designation LIKE ? OR company LIKE ?`
    : "";
  const like = `%${q}%`;
  const params = q ? [like, like, like, like, like, like] : [];

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM users ${where}`,
    params,
  );
  const [rows] = await db.query(
    `SELECT * FROM users ${where} ORDER BY name ASC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  const meta = await getSyncMeta(db);

  return res.json({
    total,
    page,
    limit,
    lastSyncedAt: meta.last_synced_at,
    lastCount: meta.last_count,
    lastError: meta.last_error,
    users: rows.map(serializeUser),
  });
});

router.get("/:id", async (req, res) => {
  const db = await getPool();
  const [rows] = await db.query("SELECT * FROM users WHERE id = ? LIMIT 1", [
    req.params.id,
  ]);
  if (!rows.length) {
    return res.status(404).json({ message: "User not found." });
  }
  const user = serializeUser(rows[0]);
  return res.json({
    user,
    fields: flattenRecord(user.payload),
  });
});

export default router;
