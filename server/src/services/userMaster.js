import { config } from "../config.js";
import { getPool } from "../db.js";
import { extractPagination, identityKey, mapUser, unwrapUsers, dedupeUsers } from "../utils/mapUser.js";
import bcrypt from "bcryptjs";

const AUTH_STRATEGIES = [
  (key) => ({ Authorization: `Bearer ${key}` }),
  (key) => ({ "X-API-Key": key }),
  (key) => ({ "x-api-key": key }),
  (key) => ({ "api-key": key }),
  (key) => ({ Authorization: key }),
];

const INSERT_BATCH_SIZE = 150;
const MAX_PAGES = 200;
const PAGE_SIZE = 200;

let workingAuthIndex = 0;

function withQuery(url, params) {
  const parsed = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    parsed.searchParams.set(key, String(value));
  }
  return parsed.toString();
}

function recordKey(record, index) {
  return identityKey(
    {
      id: record?.uuid || record?.id || record?.user_id || record?.userId,
      email: record?.email || record?.official_email || record?.work_email,
      employeeCode: record?.employee_code || record?.emp_code || record?.employee_id,
    },
    index,
  );
}

async function fetchUrl(url, authIndex) {
  const headers = {
    Accept: "application/json",
    ...AUTH_STRATEGIES[authIndex](config.userMaster.key),
  };
  const response = await fetch(url, { method: "GET", headers });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { ok: response.ok, status: response.status, body };
}

async function fetchWithWorkingAuth(url) {
  if (!config.userMaster.key) {
    throw new Error("USER_MASTER_KEY is not configured.");
  }

  const order = [
    workingAuthIndex,
    ...AUTH_STRATEGIES.map((_, index) => index).filter((index) => index !== workingAuthIndex),
  ];

  let lastFailure = null;
  for (const index of order) {
    const result = await fetchUrl(url, index);
    if (result.ok) {
      workingAuthIndex = index;
      return result.body;
    }
    lastFailure = result;
    if (result.status !== 401 && result.status !== 403) break;
  }

  const message =
    lastFailure?.body?.message ||
    lastFailure?.body?.error ||
    `User master API returned ${lastFailure?.status || "an error"}`;
  throw new Error(message);
}

async function fetchAllRawUsers() {
  const collected = [];
  const seen = new Set();

  const addUsers = (users) => {
    let added = 0;
    for (const [index, user] of users.entries()) {
      const key = recordKey(user, collected.length + index);
      if (seen.has(key)) continue;
      seen.add(key);
      collected.push(user);
      added += 1;
    }
    return added;
  };

  let page = 1;
  let pageSize = PAGE_SIZE;
  let nextUrl = withQuery(config.userMaster.url, {
    page,
    per_page: pageSize,
    limit: pageSize,
  });
  let usedQueryPaging = true;

  let consecutiveEmpty = 0;
  while (page <= MAX_PAGES && nextUrl) {
    let body;
    try {
      body = await fetchWithWorkingAuth(nextUrl);
    } catch (error) {
      if (page === 1 && usedQueryPaging) {
        usedQueryPaging = false;
        nextUrl = config.userMaster.url;
        body = await fetchWithWorkingAuth(nextUrl);
      } else {
        throw error;
      }
    }

    const users = unwrapUsers(body);
    const meta = extractPagination(body);
    if (page === 1 && users.length) pageSize = meta.perPage || users.length;
    const added = addUsers(users);

    console.log(
      `User-master page ${meta.currentPage || page}: +${added} (loaded ${collected.length}${
        meta.total ? ` / ${meta.total}` : ""
      })`,
    );

    if (!users.length) break;
    if (added === 0) {
      consecutiveEmpty += 1;
      if (consecutiveEmpty >= 2) break;
    } else {
      consecutiveEmpty = 0;
    }
    if (meta.total && collected.length >= meta.total) break;
    if (meta.lastPage && page >= meta.lastPage) break;
    if (page > 1 && users.length < pageSize && !meta.nextUrl) break;

    page += 1;
    nextUrl =
      meta.nextUrl ||
      withQuery(config.userMaster.url, {
        page,
        per_page: pageSize,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
  }

  return collected;
}


function toRow(user, passwordHash) {
  return [
    user.id,
    user.employeeCode,
    user.name,
    user.email,
    user.phone,
    user.designation,
    user.department,
    user.role,
    user.status,
    user.location,
    user.managerName,
    user.company,
    user.dateOfJoining,
    passwordHash,
    JSON.stringify(user.payload ?? {}),
  ];
}

export async function syncUsersFromMaster() {
  const rawUsers = await fetchAllRawUsers();
  const uniqueUsers = [];
  const usedIds = new Set();
  for (const user of dedupeUsers(rawUsers.map((item, index) => mapUser(item, index)))) {
    let id = String(user.id || user.email || user.employeeCode || `user-${uniqueUsers.length + 1}`);
    if (usedIds.has(id)) id = user.email || user.employeeCode || id;
    if (usedIds.has(id)) continue;
    user.id = id;
    usedIds.add(id);
    uniqueUsers.push(user);
  }
  const db = await getPool();

  if (!uniqueUsers.length) {
    await db.query(
      `INSERT INTO sync_meta (source, last_synced_at, last_count, last_error)
       VALUES ('user-master', NOW(), 0, ?)
       ON DUPLICATE KEY UPDATE last_synced_at = NOW(), last_count = 0, last_error = VALUES(last_error)`,
      ["User master API returned no records."],
    );
    return { count: 0, users: [] };
  }

  const connection = await db.getConnection();
  try {
    const passwordHash = await bcrypt.hash(config.userDefaultPassword, 10);
    await connection.beginTransaction();
    await connection.query("DELETE FROM users");
    const sql = `
      INSERT INTO users (
        id, employee_code, name, email, phone, designation, department,
        role, status, location, manager_name, company, date_of_joining,
        password_hash, payload
      ) VALUES ?
    `;
    for (let index = 0; index < uniqueUsers.length; index += INSERT_BATCH_SIZE) {
      const batch = uniqueUsers.slice(index, index + INSERT_BATCH_SIZE);
      await connection.query(sql, [batch.map((user) => toRow(user, passwordHash))]);
    }
    await connection.query(
      `INSERT INTO sync_meta (source, last_synced_at, last_count, last_error)
       VALUES ('user-master', NOW(), ?, NULL)
       ON DUPLICATE KEY UPDATE last_synced_at = NOW(), last_count = VALUES(last_count), last_error = NULL`,
      [uniqueUsers.length],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return { count: uniqueUsers.length, users: uniqueUsers };
}

export async function recordSyncError(message) {
  const db = await getPool();
  await db.query(
    `INSERT INTO sync_meta (source, last_synced_at, last_count, last_error)
     VALUES ('user-master', NOW(), 0, ?)
     ON DUPLICATE KEY UPDATE last_error = VALUES(last_error)`,
    [message],
  );
}

export function parsePayload(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export function serializeUser(row) {
  const payload = parsePayload(row.payload);
  return {
    id: row.id,
    employeeCode: row.employee_code,
    name: row.name,
    email: row.email,
    phone: row.phone,
    designation: row.designation,
    department: row.department,
    role: row.role,
    status: row.status,
    location: row.location,
    managerName: row.manager_name,
    company: row.company,
    dateOfJoining: row.date_of_joining,
    syncedAt: row.synced_at,
    payload,
  };
}
