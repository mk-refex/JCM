import express from "express";
import cors from "cors";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { getPool, initDatabase } from "./db.js";
import authRoutes from "./routes/auth.js";
import ssoAuthRoutes from "./routes/ssoAuth.js";
import userRoutes from "./routes/users.js";
import employeeRoutes from "./routes/employees.js";
import assessmentRoutes from "./routes/assessments.js";
import ssoRoutes from "./routes/sso.js";
import { recordSyncError, syncUsersFromMaster } from "./services/userMaster.js";
import { syncEmployeesFromUsers } from "./services/employees.js";
import { ensureAssessmentsForEmployees } from "./services/assessments.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Serve Vite build from client/out (no copy into server)
const clientPath = path.join(__dirname, "../../client/out");

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", async (_req, res) => {
  try {
    const db = await getPool();
    await db.query("SELECT 1");
    res.json({ ok: true, database: "up" });
  } catch {
    res.status(503).json({ ok: false, database: "down" });
  }
});

app.use("/auth", ssoAuthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/assessments", assessmentRoutes);
app.use("/api/sso-providers", ssoRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Unexpected server error." });
});

if (existsSync(clientPath)) {
  app.use(express.static(clientPath));

  // SPA fallback for client-side routes (skip API + SSO auth)
  app.get(/^(?!\/(api|auth)).*/, (_req, res) => {
    res.sendFile(path.join(clientPath, "index.html"));
  });
} else {
  console.warn(
    `Client build not found at ${clientPath}. Run "npm run build" in client/.`,
  );
}

async function hydrateOrganisation() {
  const employees = await syncEmployeesFromUsers();
  const assessments = await ensureAssessmentsForEmployees();
  console.log(
    `Employees synced: ${employees.count}. Assessments created: ${assessments.created}.`,
  );
}

async function start() {
  await initDatabase();
  try {
    const db = await getPool();
    const [[{ total }]] = await db.query("SELECT COUNT(*) AS total FROM users");
    if (!total) {
      const result = await syncUsersFromMaster();
      console.log(`Synced ${result.count} users from RefexOne user-master.`);
    } else {
      console.log(`Users already loaded (${total}). Skip user-master sync.`);
    }
    await hydrateOrganisation();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Startup hydrate failed.";
    await recordSyncError(message);
    console.error(message);
  }

  app.listen(config.port, () => {
    console.log(`JCM API listening on http://localhost:${config.port}`);
    if (existsSync(clientPath)) {
      console.log(`Serving client build from ${clientPath}`);
    }
  });
}

start().catch((error) => {
  console.error("Failed to start API:", error);
  process.exit(1);
});
