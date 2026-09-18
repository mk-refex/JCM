import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { config } from "./config.js";

let pool;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS admins (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  employee_code VARCHAR(128) NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(64) NULL,
  designation VARCHAR(255) NULL,
  department VARCHAR(255) NULL,
  role VARCHAR(128) NULL,
  status VARCHAR(64) NULL,
  location VARCHAR(255) NULL,
  manager_name VARCHAR(255) NULL,
  company VARCHAR(255) NULL,
    date_of_joining VARCHAR(64) NULL,
  password_hash VARCHAR(255) NULL,
  payload JSON NOT NULL,
  synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_users_email (email),
  KEY idx_users_employee_code (employee_code),
  KEY idx_users_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sync_meta (
  source VARCHAR(64) NOT NULL PRIMARY KEY,
  last_synced_at DATETIME NULL,
  last_count INT NOT NULL DEFAULT 0,
  last_error TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  emp_id VARCHAR(128) NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NULL,
  company VARCHAR(255) NULL,
  business_unit VARCHAR(255) NULL,
  function_name VARCHAR(255) NULL,
  department VARCHAR(255) NULL,
  designation VARCHAR(255) NULL,
  grade VARCHAR(64) NULL,
  location VARCHAR(255) NULL,
  date_of_joining VARCHAR(64) NULL,
  manager_id VARCHAR(191) NULL,
  hod_id VARCHAR(191) NULL,
  hrbp_id VARCHAR(191) NULL,
  KEY idx_employees_email (email),
  KEY idx_employees_manager (manager_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS assessments (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  code VARCHAR(64) NOT NULL,
  employee_id VARCHAR(191) NOT NULL,
  manager_id VARCHAR(191) NULL,
  hod_id VARCHAR(191) NULL,
  hrbp_id VARCHAR(191) NULL,
  status VARCHAR(64) NOT NULL,
  data JSON NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  completed_at DATETIME NULL,
  KEY idx_assessments_employee (employee_id),
  KEY idx_assessments_manager (manager_id),
  KEY idx_assessments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  assessment_id VARCHAR(191) NOT NULL,
  actor_id VARCHAR(191) NOT NULL,
  actor_name VARCHAR(255) NOT NULL,
  actor_role VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  from_status VARCHAR(64) NULL,
  to_status VARCHAR(64) NULL,
  comment TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_assessment (assessment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  assessment_id VARCHAR(191) NOT NULL,
  recipient_id VARCHAR(191) NOT NULL,
  recipient_name VARCHAR(255) NULL,
  event VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notifications_recipient (recipient_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mail_logs (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  assessment_id VARCHAR(191) NOT NULL,
  recipients JSON NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(32) NOT NULL,
  error_text TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_mail_assessment (assessment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sso_config (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  provider VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NULL,
  icon_url VARCHAR(1024) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  client_id VARCHAR(512) NULL,
  client_secret TEXT NULL,
  redirect_uri VARCHAR(1024) NULL,
  frontend_base_url VARCHAR(1024) NULL,
  authorization_url VARCHAR(1024) NULL,
  token_url VARCHAR(1024) NULL,
  user_info_url VARCHAR(1024) NULL,
  discovery_url VARCHAR(1024) NULL,
  scopes VARCHAR(512) NULL DEFAULT 'openid email profile',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key VARCHAR(64) NOT NULL PRIMARY KEY,
  value_json JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

export async function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: false,
    });
  }
  return pool;
}

export async function waitForDatabase(retries = 8) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const connection = await mysql.createConnection({
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
      });
      await connection.query(
        `CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      );
      await connection.end();
      return;
    } catch (error) {
      lastError = error;
      console.log(`Waiting for MySQL (${attempt}/${retries})...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw lastError;
}

export async function initDatabase() {
  await waitForDatabase();
  const db = await getPool();
  for (const statement of SCHEMA_SQL.split(";").map((part) => part.trim()).filter(Boolean)) {
    await db.query(statement);
  }
  await ensurePasswordColumn(db);

  const [admins] = await db.query("SELECT id FROM admins WHERE email = ? LIMIT 1", [
    config.admin.email,
  ]);
  if (!admins.length) {
    const passwordHash = await bcrypt.hash(config.admin.password, 10);
    await db.query(
      "INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)",
      [config.admin.name, config.admin.email, passwordHash],
    );
    console.log(`Seeded admin account: ${config.admin.email}`);
  }

  await applyDefaultUserPasswords(db);
  await cleanupDuplicateUsers(db);
}

export async function cleanupDuplicateUsers(db) {
  const [rows] = await db.query(
    "SELECT id, email, employee_code, designation, department, company, location, phone, manager_name, date_of_joining FROM users",
  );

  const keep = new Map();
  const remove = [];
  const richness = (row) =>
    [
      row.employee_code,
      row.designation,
      row.department,
      row.company,
      row.location,
      row.phone,
      row.manager_name,
      row.date_of_joining,
    ].filter((value) => String(value || "").trim()).length;

  for (const row of rows) {
    const email = String(row.email || "").trim().toLowerCase();
    const code = String(row.employee_code || "").trim().toLowerCase();
    const key = email ? `email:${email}` : code ? `code:${code}` : `id:${row.id}`;
    const existing = keep.get(key);
    if (!existing) {
      keep.set(key, row);
      continue;
    }
    if (richness(row) > richness(existing)) {
      remove.push(existing.id);
      keep.set(key, row);
    } else {
      remove.push(row.id);
    }
  }

  for (let i = 0; i < remove.length; i += 200) {
    const batch = remove.slice(i, i + 200);
    await db.query(
      `DELETE FROM users WHERE id IN (${batch.map(() => "?").join(",")})`,
      batch,
    );
  }

  if (remove.length) {
    console.log(`Removed ${remove.length} duplicate user rows`);
  }
}

async function ensurePasswordColumn(db) {
  const [cols] = await db.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_hash'`,
    [config.db.database],
  );
  if (!cols.length) {
    await db.query(
      "ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL AFTER date_of_joining",
    );
  }
}

export async function applyDefaultUserPasswords(db) {
  const passwordHash = await bcrypt.hash(config.userDefaultPassword, 10);
  const [result] = await db.query(
    `UPDATE users
     SET password_hash = ?
     WHERE password_hash IS NULL OR password_hash = ''`,
    [passwordHash],
  );
  if (result.affectedRows) {
    console.log(`Set default login password for ${result.affectedRows} users`);
  }
  return passwordHash;
}
