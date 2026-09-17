import { getPool } from "../src/db.js";

const db = await getPool();
const emails = [
  "gowtham.s@refex.co.in",
  "gowtham.theerthagiri@refex.co.in",
  "gowtham.s@extrovis.com",
];
for (const email of emails) {
  const [[row]] = await db.query(
    "SELECT COUNT(*) AS c FROM users WHERE LOWER(email) = ?",
    [email],
  );
  console.log(`${email.split("@")[1]} count=${row.c}`);
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
console.log(`total=${total} duplicate_emails=${dupes.duplicate_emails}`);
process.exit(0);
