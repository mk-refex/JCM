import { getPool } from "../db.js";

export const DEFAULT_SLA_STAGES = {
  INITIAL_CLARITY_CHECK: {
    label: "Initial Role Clarity Check",
    owner: "Employee",
    openFrom: "2026-09-18",
    dueOn: "2026-09-22",
  },
  SELF_ASSESSMENT_PENDING: {
    label: "Employee Self Assessment",
    owner: "Employee",
    openFrom: "2026-09-18",
    dueOn: "2026-09-22",
  },
  MANAGER_ASSESSMENT_PENDING: {
    label: "Manager Assessment",
    owner: "Manager",
    openFrom: "2026-09-18",
    dueOn: "2026-09-25",
  },
  EMPLOYEE_ALIGNMENT_PENDING: {
    label: "Employee Alignment Check",
    owner: "Employee",
    openFrom: "2026-09-18",
    dueOn: "2026-09-25",
  },
  ROLE_ALIGNMENT_REQUIRED: {
    label: "Role Alignment Conversation",
    owner: "HOD / HRBP",
    openFrom: "2026-09-18",
    dueOn: "2026-09-29",
  },
  ROLE_ALIGNMENT_IN_PROGRESS: {
    label: "Role Alignment Conversation",
    owner: "HOD / HRBP",
    openFrom: "2026-09-18",
    dueOn: "2026-09-29",
  },
  HOD_SIGNOFF_PENDING: {
    label: "HOD Final Sign-off",
    owner: "HOD",
    openFrom: "2026-09-18",
    dueOn: "2026-09-29",
  },
};

export const DEFAULT_INITIAL_CHECK_DIGEST = {
  enabled: false,
  timezone: "Asia/Kolkata",
  /** Daily local times HH:mm — e.g. ["09:00"] */
  scheduleTimes: ["09:00"],
  /** Optional specific dates YYYY-MM-DD; empty = every day within the active window */
  scheduleDates: [],
  /** Auto reminder only fires within this inclusive window */
  activeFrom: "2026-09-18",
  activeTo: "2026-09-22",
  recipientIds: [],
  extraEmails: "",
  subject: "Daily reminder: Employees yet to start Initial Role Clarity Check",
  bodyIntro:
    "The following employees have not yet started their Initial Role Clarity Check. Please follow up so they complete it within the campaign window.",
  bodyOutro:
    "This is an automated digest from Job Clarity Management. You can update recipients and schedule from Admin → SLA & Notifications.",
  lastAutoSentKey: null,
  lastAutoSentAt: null,
};

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export async function getSetting(key, fallback) {
  const db = await getPool();
  const [rows] = await db.query(
    "SELECT value_json FROM app_settings WHERE setting_key = ? LIMIT 1",
    [key],
  );
  if (!rows[0]) return structuredClone(fallback);
  return { ...structuredClone(fallback), ...parseJson(rows[0].value_json, {}) };
}

export async function setSetting(key, value) {
  const db = await getPool();
  await db.query(
    `INSERT INTO app_settings (setting_key, value_json)
     VALUES (?, CAST(? AS JSON))
     ON DUPLICATE KEY UPDATE value_json = VALUES(value_json)`,
    [key, JSON.stringify(value)],
  );
  return value;
}

function isYmd(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function isHm(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ""));
}

export async function getSlaCampaign() {
  const stored = await getSetting("sla_campaign", { stages: DEFAULT_SLA_STAGES });
  const stages = { ...DEFAULT_SLA_STAGES };
  for (const [key, defaults] of Object.entries(DEFAULT_SLA_STAGES)) {
    const row = stored.stages?.[key] || {};
    stages[key] = {
      label: defaults.label,
      owner: defaults.owner,
      openFrom: isYmd(row.openFrom) ? row.openFrom : defaults.openFrom,
      dueOn: isYmd(row.dueOn) ? row.dueOn : defaults.dueOn,
    };
  }
  return { stages };
}

export async function saveSlaCampaign(input = {}) {
  const current = await getSlaCampaign();
  const stages = { ...current.stages };
  for (const [key, defaults] of Object.entries(DEFAULT_SLA_STAGES)) {
    const row = input.stages?.[key] || {};
    const openFrom = isYmd(row.openFrom) ? row.openFrom : stages[key].openFrom;
    const dueOn = isYmd(row.dueOn) ? row.dueOn : stages[key].dueOn;
    if (openFrom > dueOn) {
      throw new Error(`${defaults.label}: Open from must be on or before Due on.`);
    }
    stages[key] = {
      label: defaults.label,
      owner: defaults.owner,
      openFrom,
      dueOn,
    };
  }
  const saved = await setSetting("sla_campaign", { stages });
  await refreshSlaFromSettings();
  return saved;
}

async function refreshSlaFromSettings() {
  const { refreshSlaCache } = await import("../lib/sla.js");
  await refreshSlaCache();
}

export async function getInitialCheckDigest() {
  const stored = await getSetting(
    "initial_check_digest",
    DEFAULT_INITIAL_CHECK_DIGEST,
  );
  return {
    ...DEFAULT_INITIAL_CHECK_DIGEST,
    ...stored,
    scheduleTimes: Array.isArray(stored.scheduleTimes)
      ? stored.scheduleTimes.filter(isHm)
      : DEFAULT_INITIAL_CHECK_DIGEST.scheduleTimes,
    scheduleDates: Array.isArray(stored.scheduleDates)
      ? stored.scheduleDates.filter(isYmd)
      : [],
    recipientIds: Array.isArray(stored.recipientIds)
      ? stored.recipientIds.map(String)
      : [],
  };
}

export async function saveInitialCheckDigest(input = {}) {
  const current = await getInitialCheckDigest();
  const scheduleTimes = (
    Array.isArray(input.scheduleTimes)
      ? input.scheduleTimes
      : String(input.scheduleTimes || "")
          .split(",")
          .map((v) => v.trim())
  ).filter(isHm);

  const scheduleDates = (
    Array.isArray(input.scheduleDates)
      ? input.scheduleDates
      : String(input.scheduleDates || "")
          .split(",")
          .map((v) => v.trim())
  ).filter(isYmd);

  const activeFrom = isYmd(input.activeFrom)
    ? input.activeFrom
    : current.activeFrom;
  const activeTo = isYmd(input.activeTo) ? input.activeTo : current.activeTo;
  if (activeFrom > activeTo) {
    throw new Error("Active from must be on or before Active to.");
  }

  const next = {
    enabled: Boolean(input.enabled),
    timezone: String(input.timezone || current.timezone || "Asia/Kolkata").trim(),
    scheduleTimes: scheduleTimes.length
      ? scheduleTimes
      : DEFAULT_INITIAL_CHECK_DIGEST.scheduleTimes,
    scheduleDates,
    activeFrom,
    activeTo,
    recipientIds: Array.isArray(input.recipientIds)
      ? input.recipientIds.map(String).filter(Boolean)
      : current.recipientIds,
    extraEmails: String(input.extraEmails ?? current.extraEmails ?? "").trim(),
    subject: String(input.subject || current.subject).trim(),
    bodyIntro: String(input.bodyIntro || current.bodyIntro).trim(),
    bodyOutro: String(input.bodyOutro || current.bodyOutro).trim(),
    lastAutoSentKey: current.lastAutoSentKey,
    lastAutoSentAt: current.lastAutoSentAt,
  };

  return setSetting("initial_check_digest", next);
}

export async function markDigestAutoSent(sentKey) {
  const current = await getInitialCheckDigest();
  return setSetting("initial_check_digest", {
    ...current,
    lastAutoSentKey: sentKey,
    lastAutoSentAt: new Date().toISOString(),
  });
}

export async function seedDefaultSettings() {
  const db = await getPool();
  const [sla] = await db.query(
    "SELECT setting_key FROM app_settings WHERE setting_key = 'sla_campaign' LIMIT 1",
  );
  if (!sla.length) {
    await setSetting("sla_campaign", { stages: DEFAULT_SLA_STAGES });
  }
  const [digest] = await db.query(
    "SELECT setting_key FROM app_settings WHERE setting_key = 'initial_check_digest' LIMIT 1",
  );
  if (!digest.length) {
    await setSetting("initial_check_digest", DEFAULT_INITIAL_CHECK_DIGEST);
  }
}
