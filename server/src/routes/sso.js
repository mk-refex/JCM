import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { getPool } from "../db.js";
import { buildSsoPayload, formatSsoProvider } from "../services/sso.js";

const router = Router();
router.use(requireAdmin);

router.get("/", async (_req, res) => {
  const db = await getPool();
  const [rows] = await db.query(
    `SELECT * FROM sso_config
     ORDER BY sort_order ASC, display_name ASC, provider ASC`,
  );
  return res.json({ providers: rows.map(formatSsoProvider) });
});

router.post("/", async (req, res) => {
  try {
    const payload = buildSsoPayload(req.body || {}, { requireProvider: true });
    const db = await getPool();
    const [existing] = await db.query(
      "SELECT id FROM sso_config WHERE provider = ? LIMIT 1",
      [payload.provider],
    );
    if (existing[0]) {
      return res.status(409).json({ message: "Provider slug already exists." });
    }

    const [result] = await db.query(
      `INSERT INTO sso_config (
        provider, display_name, icon_url, sort_order, is_active,
        client_id, client_secret, redirect_uri, frontend_base_url,
        authorization_url, token_url, user_info_url, discovery_url, scopes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.provider,
        payload.display_name ?? payload.provider,
        payload.icon_url ?? null,
        payload.sort_order ?? 0,
        payload.is_active ?? 1,
        payload.client_id ?? "",
        payload.client_secret ?? "",
        payload.redirect_uri ?? null,
        payload.frontend_base_url ?? null,
        payload.authorization_url ?? null,
        payload.token_url ?? null,
        payload.user_info_url ?? null,
        payload.discovery_url ?? null,
        payload.scopes ?? "openid email profile",
      ],
    );

    const [rows] = await db.query("SELECT * FROM sso_config WHERE id = ? LIMIT 1", [
      result.insertId,
    ]);
    return res.status(201).json({ provider: formatSsoProvider(rows[0]) });
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to create SSO provider.",
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const db = await getPool();
    const [rows] = await db.query("SELECT * FROM sso_config WHERE id = ? LIMIT 1", [id]);
    if (!rows[0]) return res.status(404).json({ message: "SSO provider not found." });

    const payload = buildSsoPayload(req.body || {});
    if (payload.provider && payload.provider !== rows[0].provider) {
      const [clash] = await db.query(
        "SELECT id FROM sso_config WHERE provider = ? AND id <> ? LIMIT 1",
        [payload.provider, id],
      );
      if (clash[0]) {
        return res.status(409).json({ message: "Provider slug already exists." });
      }
    }

    const next = { ...rows[0], ...payload };
    await db.query(
      `UPDATE sso_config SET
        provider = ?, display_name = ?, icon_url = ?, sort_order = ?, is_active = ?,
        client_id = ?, client_secret = ?, redirect_uri = ?, frontend_base_url = ?,
        authorization_url = ?, token_url = ?, user_info_url = ?, discovery_url = ?, scopes = ?
       WHERE id = ?`,
      [
        next.provider,
        next.display_name,
        next.icon_url,
        next.sort_order,
        next.is_active,
        next.client_id,
        next.client_secret,
        next.redirect_uri,
        next.frontend_base_url,
        next.authorization_url,
        next.token_url,
        next.user_info_url,
        next.discovery_url,
        next.scopes,
        id,
      ],
    );

    const [updated] = await db.query("SELECT * FROM sso_config WHERE id = ? LIMIT 1", [id]);
    return res.json({ provider: formatSsoProvider(updated[0]) });
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to update SSO provider.",
    });
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const db = await getPool();
  const [result] = await db.query("DELETE FROM sso_config WHERE id = ?", [id]);
  if (!result.affectedRows) {
    return res.status(404).json({ message: "SSO provider not found." });
  }
  return res.json({ ok: true });
});

export default router;
