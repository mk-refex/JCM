import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { getPool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { resolveSessionRole } from "../services/employees.js";
import { serializeUser } from "../services/userMaster.js";
import {
  buildCallbackRedirect,
  extractEmailFromProfile,
  loginErrorRedirect,
  resolveOidcEndpoints,
  resolveRedirectUri,
} from "../services/sso.js";

const router = Router();

function signToken(claims) {
  return jwt.sign(claims, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function toAdminSession(admin) {
  return {
    id: `ADM-${admin.id}`,
    name: admin.name,
    email: admin.email,
    role: "ADMIN",
    employeeId: null,
    title: "HR Administrator",
  };
}

async function toUserSession(row) {
  const record = serializeUser(row);
  const role = await resolveSessionRole(record);
  return {
    id: record.id,
    name: record.name,
    email: record.email || "",
    role,
    employeeId: record.id,
    title: record.designation || "Employee",
  };
}

async function loadActiveSsoProvider(providerSlug) {
  const provider = String(providerSlug || "").trim().toLowerCase();
  if (!provider) return null;
  const db = await getPool();
  const [rows] = await db.query(
    `SELECT * FROM sso_config
     WHERE provider = ? AND is_active = 1
       AND client_id IS NOT NULL AND client_id <> ''
     LIMIT 1`,
    [provider],
  );
  return rows[0] || null;
}

router.post("/login", async (req, res) => {
  const identifier = String(req.body?.email || "").trim();
  const password = String(req.body?.password || "");

  if (!identifier || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const db = await getPool();
  const email = identifier.toLowerCase();

  const [admins] = await db.query(
    "SELECT id, name, email, password_hash FROM admins WHERE email = ? LIMIT 1",
    [email],
  );
  if (admins[0]) {
    const valid = await bcrypt.compare(password, admins[0].password_hash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    const user = toAdminSession(admins[0]);
    const token = signToken({
      sub: admins[0].id,
      email: admins[0].email,
      role: "ADMIN",
      kind: "admin",
    });
    return res.json({ token, user });
  }

  const [users] = await db.query(
    `SELECT * FROM users
     WHERE LOWER(email) = ? OR employee_code = ?
     LIMIT 1`,
    [email, identifier],
  );
  const row = users[0];
  if (!row?.password_hash) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const user = await toUserSession(row);
  const token = signToken({
    sub: row.id,
    email: user.email,
    role: user.role,
    kind: "user",
  });
  return res.json({ token, user });
});

router.get("/sso-providers", async (_req, res) => {
  try {
    const db = await getPool();
    const [rows] = await db.query(
      `SELECT provider, display_name, icon_url, sort_order
       FROM sso_config
       WHERE is_active = 1
         AND client_id IS NOT NULL AND client_id <> ''
       ORDER BY sort_order ASC, display_name ASC, provider ASC`,
    );
    return res.json(
      rows.map((row) => ({
        provider: row.provider,
        displayName: row.display_name,
        iconUrl: row.icon_url,
        sortOrder: row.sort_order,
      })),
    );
  } catch (error) {
    console.error("listPublicProviders error:", error);
    return res.status(500).json({ message: "Failed to load SSO providers." });
  }
});

router.get("/sso/:provider", async (req, res) => {
  try {
    const provider = String(req.params.provider || "").trim().toLowerCase();
    const configRow = await loadActiveSsoProvider(provider);
    if (!configRow?.client_id) {
      return res.status(400).json({
        message: `${provider || "SSO"} is not configured. Contact admin.`,
      });
    }

    const endpoints = await resolveOidcEndpoints(configRow);
    if (!endpoints.authorizationUrl) {
      return res.status(400).json({
        message: "SSO authorization URL is not configured. Contact admin.",
      });
    }

    const redirectUri = resolveRedirectUri(configRow, req, provider);
    const state = String(req.query.state || configRow.frontend_base_url || "").replace(
      /\/$/,
      "",
    );
    const params = new URLSearchParams({
      client_id: configRow.client_id,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: endpoints.scopes,
      ...(state ? { state } : {}),
    });

    return res.redirect(`${endpoints.authorizationUrl}?${params.toString()}`);
  } catch (error) {
    console.error("SSO redirect error:", error);
    return res.status(500).json({ message: "SSO not available." });
  }
});

router.get("/sso/:provider/callback", async (req, res) => {
  const { code, state } = req.query;
  const provider = String(req.params.provider || "").trim().toLowerCase();

  if (!code) {
    return res.redirect(loginErrorRedirect(state, "no_code"));
  }

  try {
    const db = await getPool();
    const [rows] = await db.query(
      "SELECT * FROM sso_config WHERE provider = ? AND is_active = 1 LIMIT 1",
      [provider],
    );
    const configRow = rows[0];

    if (!configRow?.client_id || !configRow?.client_secret) {
      return res.redirect(loginErrorRedirect(state, "not_configured"));
    }

    const endpoints = await resolveOidcEndpoints(configRow);
    if (!endpoints.tokenUrl || !endpoints.userInfoUrl) {
      return res.redirect(loginErrorRedirect(state, "not_configured"));
    }

    const redirectUri = resolveRedirectUri(configRow, req, provider);
    const tokenRes = await fetch(endpoints.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: String(code),
        client_id: configRow.client_id,
        client_secret: configRow.client_secret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error(`${provider} token error:`, err);
      return res.redirect(loginErrorRedirect(state, "token_failed"));
    }

    const tokens = await tokenRes.json();
    const userRes = await fetch(endpoints.userInfoUrl, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userRes.ok) {
      return res.redirect(loginErrorRedirect(state, "profile_failed"));
    }

    const profile = await userRes.json();
    const email = extractEmailFromProfile(profile);
    if (!email) {
      return res.redirect(loginErrorRedirect(state, "no_email"));
    }

    const [admins] = await db.query(
      "SELECT id, name, email FROM admins WHERE LOWER(email) = ? LIMIT 1",
      [email],
    );
    if (admins[0]) {
      const user = toAdminSession(admins[0]);
      const token = signToken({
        sub: admins[0].id,
        email: admins[0].email,
        role: "ADMIN",
        kind: "admin",
      });
      return res.redirect(buildCallbackRedirect(configRow, state, token, user));
    }

    const [users] = await db.query(
      "SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1",
      [email],
    );
    const row = users[0];
    if (!row) {
      return res.redirect(loginErrorRedirect(state, "user_not_found"));
    }

    const user = await toUserSession(row);
    const token = signToken({
      sub: row.id,
      email: user.email,
      role: user.role,
      kind: "user",
    });
    return res.redirect(buildCallbackRedirect(configRow, state, token, user));
  } catch (error) {
    console.error(`${provider} callback error:`, error);
    return res.redirect(loginErrorRedirect(req.query.state, "login_failed"));
  }
});

router.get("/me", requireAuth, (req, res) => {
  return res.json({ user: req.auth.user });
});

export default router;
