import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env") });

function required(name, fallback = "") {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: required("JWT_SECRET", "jcm-dev-jwt-secret-change-in-production"),
  jwtExpiresIn: "12h",
  appUrl: String(
    process.env.FRONTEND_URL ||
      process.env.APP_URL ||
      "http://localhost:3000",
  ).replace(/\/$/, ""),
  db: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "jcm",
  },
  admin: {
    name: process.env.ADMIN_NAME || "HR Administrator",
    email: process.env.ADMIN_EMAIL || "admin@refex.co.in",
    password: process.env.ADMIN_PASSWORD || "Admin@123",
  },
  userDefaultPassword: process.env.USER_DEFAULT_PASSWORD || "Welcome@2026",
  userMaster: {
    url: process.env.USER_MASTER_URL || "https://refexone.com/api/v1/user-master",
    key: process.env.USER_MASTER_KEY || "",
  },
  mail: {
    host: process.env.SMTP_HOST || "smtp.office365.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    user: process.env.SMTP_USER || "",
    password: process.env.SMTP_PASS || "",
    from:
      process.env.SMTP_FROM ||
      (process.env.SMTP_USER
        ? `Job Clarity Management <${process.env.SMTP_USER}>`
        : "Job Clarity Management <noreply@refex.co.in>"),
    hrbpEmail: process.env.MAIL_HRBP_EMAIL || "",
    cc: String(process.env.MAIL_CC || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  },
};
