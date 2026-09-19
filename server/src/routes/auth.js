import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { getPool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { resolveSessionRole } from "../services/employees.js";
import { serializeUser } from "../services/userMaster.js";
import { requestLoginOtp, verifyLoginOtp } from "../services/otpAuth.js";

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

router.post("/otp/request", async (req, res) => {
  try {
    const result = await requestLoginOtp(req.body?.email);
    return res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      message:
        error instanceof Error
          ? error.message
          : "Could not send one-time code.",
    });
  }
});

router.post("/otp/verify", async (req, res) => {
  try {
    const result = await verifyLoginOtp(req.body?.email, req.body?.code);
    return res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      message:
        error instanceof Error ? error.message : "Could not verify the code.",
      code: error.code || undefined,
    });
  }
});

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

router.get("/me", requireAuth, (req, res) => {
  return res.json({ user: req.auth.user });
});

export default router;
