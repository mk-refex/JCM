function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getPath(source, path) {
  if (!isPlainObject(source) && !Array.isArray(source)) return undefined;
  const parts = path.split(".");
  let current = source;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

function firstString(source, paths) {
  for (const path of paths) {
    const value = getPath(source, path);
    if (value === undefined || value === null) continue;
    if (typeof value === "boolean" || typeof value === "number") return String(value);
    const text = String(value).trim();
    if (text) return text;
  }
  return null;
}

function joinName(source) {
  const first = firstString(source, [
    "first_name",
    "firstName",
    "firstname",
    "given_name",
  ]);
  const middle = firstString(source, ["middle_name", "middleName"]);
  const last = firstString(source, [
    "last_name",
    "lastName",
    "lastname",
    "surname",
  ]);
  const parts = [first, middle, last].filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}

export function extractPagination(body) {
  if (!isPlainObject(body)) {
    return { total: null, lastPage: null, nextUrl: null, perPage: null, currentPage: null };
  }

  const meta = isPlainObject(body.meta)
    ? body.meta
    : isPlainObject(body.pagination)
      ? body.pagination
      : body;

  const toNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
  };

  const nextUrl =
    (typeof body.links?.next === "string" && body.links.next) ||
    (typeof meta.next_page_url === "string" && meta.next_page_url) ||
    (typeof body.next_page_url === "string" && body.next_page_url) ||
    (typeof meta.next === "string" && meta.next) ||
    null;

  return {
    total: toNumber(meta.total ?? body.total ?? body.count ?? meta.count),
    lastPage: toNumber(
      meta.last_page ?? meta.lastPage ?? body.last_page ?? body.lastPage ?? meta.pages,
    ),
    perPage: toNumber(
      meta.per_page ?? meta.perPage ?? body.per_page ?? body.limit ?? meta.limit,
    ),
    currentPage: toNumber(
      meta.current_page ?? meta.currentPage ?? body.current_page ?? body.page,
    ),
    nextUrl,
  };
}

export function unwrapUsers(body) {
  if (Array.isArray(body)) return body;
  if (!isPlainObject(body)) return [];

  const candidates = [
    body.data,
    body.users,
    body.results,
    body.records,
    body.items,
    body.payload,
    body.data?.data,
    body.data?.users,
    body.data?.results,
    body.data?.records,
    body.data?.items,
    body.result?.data,
    body.response?.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  if (isPlainObject(body.data) && !Array.isArray(body.data)) {
    return [body.data];
  }

  return [];
}

export function mapUser(raw, index = 0) {
  const record = isPlainObject(raw) ? raw : { value: raw };
  const name = firstString(record, [
    "name",
    "full_name",
    "fullName",
    "employee_name",
    "employeeName",
    "display_name",
    "displayName",
    "user_name",
    "userName",
    "username",
  ]) || joinName(record);

  const employeeCode = firstString(record, [
    "adrenalin_employee_id",
    "employee_code",
    "employeeCode",
    "emp_code",
    "empCode",
    "emp_id",
    "empId",
    "employee_id",
    "employeeId",
    "employee_no",
    "employeeNo",
    "code",
    "staff_id",
    "staffId",
  ]);

  const id =
    firstString(record, [
      "uuid",
      "id",
      "user_id",
      "userId",
      "user_uuid",
      "pk",
    ]) ||
    employeeCode ||
    firstString(record, ["email", "official_email", "work_email"]) ||
    `user-${index + 1}`;

  const statusRaw = firstString(record, [
    "status",
    "user_status",
    "employment_status",
    "is_active",
    "isActive",
    "active",
  ]);

  let status = statusRaw;
  if (statusRaw === "1" || statusRaw === "true") status = "Active";
  if (statusRaw === "0" || statusRaw === "false") status = "Inactive";

  const email = firstString(record, [
    "email",
    "email_id",
    "emailId",
    "official_email",
    "officialEmail",
    "work_email",
    "workEmail",
    "company_email",
    "companyEmail",
  ]);

  return {
    id: String(id),
    employeeCode,
    name: name || "Unnamed user",
    email: email ? email.toLowerCase() : null,
    phone: firstString(record, [
      "phone",
      "mobile",
      "work_mobile",
      "employee_mobile",
      "mobile_no",
      "mobileNo",
      "phone_number",
      "phoneNumber",
      "contact_number",
      "contactNumber",
      "whatsapp",
    ]),
    designation: firstString(record, [
      "designation",
      "job_title",
      "jobTitle",
      "title",
      "position",
      "role_title",
    ]),
    department: firstString(record, [
      "department",
      "department_name",
      "departmentName",
      "dept",
      "function",
      "function_name",
      "functionName",
    ]),
    role: firstString(record, [
      "role",
      "user_role",
      "userRole",
      "role_name",
      "roleName",
      "access_role",
    ]),
    status,
    location: firstString(record, [
      "location",
      "work_location",
      "workLocation",
      "city",
      "branch",
      "office",
      "site",
    ]),
    managerName: firstString(record, [
      "supervisor_name",
      "manager_name",
      "managerName",
      "reporting_manager",
      "reportingManager",
      "reporting_manager_name",
      "rm_name",
      "rmName",
      "manager",
    ]),
    company: firstString(record, [
      "company",
      "company_name",
      "companyName",
      "organisation",
      "organization",
      "business_line",
      "business_unit",
      "businessUnit",
      "bu",
    ]),
    dateOfJoining: firstString(record, [
      "joining_date",
      "date_of_joining",
      "dateOfJoining",
      "doj",
    ]),
    payload: record,
  };
}

export function flattenRecord(value, prefix = "") {
  if (value === null || value === undefined) {
    return prefix ? [{ key: prefix, value: "—" }] : [];
  }
  if (Array.isArray(value)) {
    if (!value.length) return [{ key: prefix || "items", value: "[]" }];
    if (value.every((item) => item === null || typeof item !== "object")) {
      return [{ key: prefix || "items", value: value.map((item) => String(item)).join(", ") }];
    }
    return value.flatMap((item, index) =>
      flattenRecord(item, prefix ? `${prefix}[${index}]` : `[${index}]`),
    );
  }
  if (typeof value === "object") {
    return Object.entries(value).flatMap(([key, nested]) =>
      flattenRecord(nested, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [{ key: prefix || "value", value: String(value) }];
}

export function identityKey(user, index = 0) {
  const email = String(user?.email || "").trim().toLowerCase();
  if (email) return `email:${email}`;
  const code = String(user?.employeeCode || user?.employee_code || "").trim().toLowerCase();
  if (code) return `code:${code}`;
  const id = String(user?.id || user?.uuid || user?.user_id || "").trim();
  if (id) return `id:${id}`;
  return `idx:${index}`;
}

function richness(user) {
  return [
    user.employeeCode,
    user.employee_code,
    user.designation,
    user.department,
    user.company,
    user.location,
    user.phone,
    user.managerName,
    user.manager_name,
    user.dateOfJoining,
    user.date_of_joining,
  ].filter((value) => String(value || "").trim()).length;
}

export function dedupeUsers(users) {
  const keep = new Map();
  for (const [index, user] of users.entries()) {
    const key = identityKey(user, index);
    const existing = keep.get(key);
    if (!existing || richness(user) > richness(existing)) {
      keep.set(key, user);
    }
  }
  return [...keep.values()];
}
