import { getPool } from "../src/db.js";

function identityKey(row) {
  const email = String(row.email || "").trim().toLowerCase();
  if (email) return `email:${email}`;
  const code = String(row.employee_code || "").trim().toLowerCase();
  if (code) return `code:${code}`;
  return `id:${row.id}`;
}

function richness(row) {
  return [
    row.employee_code,
    row.designation,
    row.department,
    row.company,
    row.location,
    row.phone,
    row.manager_name,
    row.date_of_joining,
  ].filter((value) => String(value || "").trim()).length;
}

const db = await getPool();
const [rows] = await db.query(
  "SELECT id, email, employee_code, designation, department, company, location, phone, manager_name, date_of_joining FROM users",
);

const keep = new Map();
const remove = [];
for (const row of rows) {
  const key = identityKey(row);
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

if (remove.length) {
  for (let i = 0; i < remove.length; i += 200) {
    const batch = remove.slice(i, i + 200);
    await db.query(`DELETE FROM users WHERE id IN (${batch.map(() => "?").join(",")})`, batch);
  }
}

const [[{ total }]] = await db.query("SELECT COUNT(*) AS total FROM users");
const [[dupes]] = await db.query(
  `SELECT COUNT(*) AS duplicate_emails FROM (
     SELECT LOWER(email) AS email
     FROM users
     WHERE email IS NOT NULL AND email <> ''
     GROUP BY LOWER(email)
     HAVING COUNT(*) > 1
   ) t`,
);

console.log(`removed=${remove.length} remaining=${total} duplicate_emails=${dupes.duplicate_emails}`);
process.exit(0);
