import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { getPool } from "../db.js";
import { resolveSessionRole } from "../services/employees.js";
import { serializeUser } from "../services/userMaster.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    return res.status(401).json({ message: "Sign in required." });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const db = await getPool();

    if (payload.kind === "admin" || (payload.kind !== "user" && payload.role === "ADMIN")) {
      const [rows] = await db.query(
        "SELECT id, name, email FROM admins WHERE id = ? LIMIT 1",
        [payload.sub],
      );
      if (!rows.length) {
        return res.status(401).json({ message: "Admin account no longer exists." });
      }
      req.auth = {
        kind: "admin",
        role: "ADMIN",
        user: {
          id: `ADM-${rows[0].id}`,
          name: rows[0].name,
          email: rows[0].email,
          role: "ADMIN",
          employeeId: null,
          title: "HR Administrator",
        },
      };
      req.admin = rows[0];
      return next();
    }

    const [rows] = await db.query("SELECT * FROM users WHERE id = ? LIMIT 1", [
      payload.sub,
    ]);
    if (!rows.length) {
      return res.status(401).json({ message: "User account no longer exists." });
    }
    const record = serializeUser(rows[0]);
    const role = await resolveSessionRole(record);
    req.auth = {
      kind: "user",
      role,
      user: {
        id: record.id,
        name: record.name,
        email: record.email || payload.email,
        role,
        employeeId: record.id,
        title: record.designation || "Employee",
      },
    };
    return next();
  } catch {
    return res.status(401).json({ message: "Session expired. Please sign in again." });
  }
}

export async function requireAdmin(req, res, next) {
  return requireAuth(req, res, () => {
    if (req.auth?.role !== "ADMIN") {
      return res.status(403).json({ message: "Admin access required." });
    }
    return next();
  });
}
