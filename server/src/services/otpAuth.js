import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { getPool } from "../db.js";
import { resolveSessionRole } from "./employees.js";
import { serializeUser } from "./userMaster.js";
import { sendLoginOtpEmail } from "./mailer.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_COOLDOWN_MS = 45 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function hashOtp(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

function maskEmail(email) {
  const value = String(email || "").trim().toLowerCase();
  const [local, domain] = value.split("@");
  if (!local || !domain) return value;
  if (local.length <= 2) return `${local[0] || "*"}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

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

async function findAccountByEmail(email) {
  const db = await getPool();
  const normalised = email.toLowerCase();

  const [admins] = await db.query(
    "SELECT id, name, email FROM admins WHERE LOWER(email) = ? LIMIT 1",
    [normalised],
  );
  if (admins[0]) {
    return {
      kind: "admin",
      subjectId: String(admins[0].id),
      email: String(admins[0].email).toLowerCase(),
      name: admins[0].name,
      row: admins[0],
    };
  }

  const [users] = await db.query(
    `SELECT * FROM users
     WHERE LOWER(email) = ?
     LIMIT 1`,
    [normalised],
  );
  if (users[0]?.email) {
    return {
      kind: "user",
      subjectId: String(users[0].id),
      email: String(users[0].email).toLowerCase(),
      name: users[0].name,
      row: users[0],
    };
  }

  return null;
}

export async function requestLoginOtp(rawEmail) {
  const email = String(rawEmail || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    const error = new Error("Enter a valid work email address.");
    error.status = 400;
    throw error;
  }

  const account = await findAccountByEmail(email);
  if (!account) {
    const error = new Error(
      "No Job Clarity account was found for this email. Contact HR if you believe this is incorrect.",
    );
    error.status = 404;
    throw error;
  }

  const db = await getPool();
  const cooldownSeconds = Math.ceil(OTP_COOLDOWN_MS / 1000);
  const [recent] = await db.query(
    `SELECT id FROM login_otps
     WHERE email = ?
       AND consumed_at IS NULL
       AND created_at > (NOW() - INTERVAL ${cooldownSeconds} SECOND)
     ORDER BY id DESC LIMIT 1`,
    [account.email],
  );
  if (recent[0]) {
    const error = new Error(
      "Please wait a moment before requesting another code.",
    );
    error.status = 429;
    throw error;
  }

  await db.query(
    `UPDATE login_otps
     SET consumed_at = NOW()
     WHERE email = ? AND consumed_at IS NULL`,
    [account.email],
  );

  const code = generateOtp();
  const ttlSeconds = Math.round(OTP_TTL_MS / 1000);
  await db.query(
    `INSERT INTO login_otps (email, code_hash, kind, subject_id, expires_at)
     VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ${ttlSeconds} SECOND))`,
    [account.email, hashOtp(code), account.kind, account.subjectId],
  );

  const mail = await sendLoginOtpEmail({
    to: account.email,
    name: account.name,
    code,
    expiresMinutes: Math.round(OTP_TTL_MS / 60000),
  });

  if (!mail.sent && mail.reason === "SMTP not configured") {
    const error = new Error(
      "Email delivery is not configured. Contact your administrator.",
    );
    error.status = 503;
    throw error;
  }

  if (!mail.sent) {
    const error = new Error(
      "Could not send the one-time code. Please try again shortly.",
    );
    error.status = 502;
    throw error;
  }

  return {
    ok: true,
    email: account.email,
    maskedEmail: maskEmail(account.email),
    expiresInSeconds: Math.round(OTP_TTL_MS / 1000),
  };
}

export async function verifyLoginOtp(rawEmail, rawCode) {
  const email = String(rawEmail || "").trim().toLowerCase();
  const code = String(rawCode || "").trim().replace(/\s+/g, "");

  if (!email || !email.includes("@")) {
    const error = new Error("Enter a valid work email address.");
    error.status = 400;
    throw error;
  }
  if (!/^\d{6}$/.test(code)) {
    const error = new Error("Enter the 6-digit code from your email.");
    error.status = 400;
    throw error;
  }

  const db = await getPool();
  const [rows] = await db.query(
    `SELECT *,
            (expires_at <= NOW()) AS is_expired
     FROM login_otps
     WHERE email = ? AND consumed_at IS NULL
     ORDER BY id DESC
     LIMIT 1`,
    [email],
  );
  const otp = rows[0];
  if (!otp) {
    const error = new Error(
      "No active code found. Request a new one-time code.",
    );
    error.status = 400;
    throw error;
  }

  if (Number(otp.is_expired) === 1) {
    await db.query("UPDATE login_otps SET consumed_at = NOW() WHERE id = ?", [
      otp.id,
    ]);
    const error = new Error(
      "This code has expired. Request a new one-time code.",
    );
    error.status = 400;
    error.code = "OTP_EXPIRED";
    throw error;
  }

  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    await db.query("UPDATE login_otps SET consumed_at = NOW() WHERE id = ?", [
      otp.id,
    ]);
    const error = new Error(
      "Too many incorrect attempts. Request a new one-time code.",
    );
    error.status = 429;
    throw error;
  }

  if (hashOtp(code) !== otp.code_hash) {
    await db.query("UPDATE login_otps SET attempts = attempts + 1 WHERE id = ?", [
      otp.id,
    ]);
    const remaining = OTP_MAX_ATTEMPTS - (otp.attempts + 1);
    const error = new Error(
      remaining > 0
        ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
        : "Incorrect code. Request a new one-time code.",
    );
    error.status = 401;
    throw error;
  }

  await db.query("UPDATE login_otps SET consumed_at = NOW() WHERE id = ?", [
    otp.id,
  ]);

  if (otp.kind === "admin") {
    const [admins] = await db.query(
      "SELECT id, name, email FROM admins WHERE id = ? LIMIT 1",
      [otp.subject_id],
    );
    if (!admins[0]) {
      const error = new Error("Account is no longer available.");
      error.status = 404;
      throw error;
    }
    const user = toAdminSession(admins[0]);
    const token = signToken({
      sub: admins[0].id,
      email: admins[0].email,
      role: "ADMIN",
      kind: "admin",
    });
    return { token, user };
  }

  const [users] = await db.query("SELECT * FROM users WHERE id = ? LIMIT 1", [
    otp.subject_id,
  ]);
  if (!users[0]) {
    const error = new Error("Account is no longer available.");
    error.status = 404;
    throw error;
  }

  const user = await toUserSession(users[0]);
  const token = signToken({
    sub: users[0].id,
    email: user.email,
    role: user.role,
    kind: "user",
  });
  return { token, user };
}
