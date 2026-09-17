import { getPool, initDatabase } from "../src/db.js";

await initDatabase();
const db = await getPool();
const [rows] = await db.query(
  `SELECT
     COUNT(*) AS total,
     SUM(CASE WHEN password_hash IS NULL OR password_hash = '' THEN 0 ELSE 1 END) AS with_password
   FROM users`,
);
console.log(`total=${rows[0].total} with_password=${rows[0].with_password}`);
process.exit(0);
