import { getPool } from "../src/db.js";

const db = await getPool();
const [rows] = await db.query(
  "SELECT payload FROM users WHERE payload IS NOT NULL LIMIT 3",
);
for (const row of rows) {
  const payload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
  console.log(Object.keys(payload || {}).sort().join(","));
}
process.exit(0);
