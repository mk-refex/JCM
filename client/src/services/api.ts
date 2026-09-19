import type {
  Assessment,
  AuditEntry,
  Employee,
  MasterUser,
  MasterUserField,
  Notification,
  User,
} from "@/types/domain";

const TOKEN_KEY = "jcs.token";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(path, { ...options, headers });
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { message: text };
  }

  if (!response.ok) {
    const message =
      (body as { message?: string } | null)?.message ||
      `Request failed (${response.status})`;
    if (response.status === 401) setToken(null);
    throw new ApiError(message, response.status);
  }

  return body as T;
}

export function loginAdmin(email: string, password: string) {
  return request<{ token: string; user: User }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function requestLoginOtp(email: string) {
  return request<{
    ok: boolean;
    email: string;
    maskedEmail: string;
    expiresInSeconds: number;
  }>("/api/auth/otp/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function verifyLoginOtp(email: string, code: string) {
  return request<{ token: string; user: User }>("/api/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });
}

export function fetchCurrentAdmin() {
  return request<{ user: User }>("/api/auth/me");
}

export function fetchWorkspace() {
  return request<{
    user: User;
    employee: Employee | null;
    employees: Employee[];
    assessments: Assessment[];
    notifications: Notification[];
    redirectTo: string;
  }>("/api/assessments/workspace");
}

export function fetchAssessmentAudit(id: string) {
  return request<{ auditLogs: AuditEntry[] }>(
    `/api/assessments/${encodeURIComponent(id)}/audit`,
  );
}

export function fetchEmployees() {
  return request<{ employees: Employee[] }>("/api/employees");
}

export function updateEmployeeHierarchy(
  id: string,
  patch: { hodId?: string | null; hrbpId?: string | null },
) {
  return request<{ employee: Employee }>(
    `/api/employees/${encodeURIComponent(id)}/hierarchy`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    },
  );
}

export function importEmployeeHierarchy(
  rows: Array<{ empId: string; hodCode?: string | null; hrbpCode?: string | null }>,
) {
  return request<{
    message: string;
    total: number;
    updated: number;
    skipped: number;
    notFound: string[];
    unresolvedHod: Array<{ empId: string; code: string }>;
    unresolvedHrbp: Array<{ empId: string; code: string }>;
  }>("/api/employees/import-hierarchy", {
    method: "POST",
    body: JSON.stringify({ rows }),
  });
}

export function postInitialClarity(id: string, response: string) {
  return request<{ assessment: Assessment }>("/api/assessments/" + encodeURIComponent(id) + "/initial-clarity", {
    method: "POST",
    body: JSON.stringify({ response }),
  });
}

export function postSelfDraft(id: string, input: unknown) {
  return request<{ assessment: Assessment }>(`/api/assessments/${encodeURIComponent(id)}/self-draft`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function postSelfSubmit(id: string, input: unknown) {
  return request<{ assessment: Assessment }>(`/api/assessments/${encodeURIComponent(id)}/self-submit`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function postManagerDraft(id: string, input: unknown) {
  return request<{ assessment: Assessment }>(`/api/assessments/${encodeURIComponent(id)}/manager-draft`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function postManagerSubmit(id: string, input: unknown) {
  return request<{ assessment: Assessment }>(`/api/assessments/${encodeURIComponent(id)}/manager-submit`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function postAlignment(id: string, decision: string) {
  return request<{ assessment: Assessment }>(`/api/assessments/${encodeURIComponent(id)}/alignment`, {
    method: "POST",
    body: JSON.stringify({ decision }),
  });
}

export function postAlignmentConversation(
  id: string,
  input: { hodComments?: string; hrbpComments?: string; complete?: boolean },
) {
  return request<{ assessment: Assessment }>(
    `/api/assessments/${encodeURIComponent(id)}/alignment-conversation`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function postHodSignoff(id: string, comments: string) {
  return request<{ assessment: Assessment }>(
    `/api/assessments/${encodeURIComponent(id)}/hod-signoff`,
    {
      method: "POST",
      body: JSON.stringify({ comments }),
    },
  );
}

export function markNotificationReadApi(id: string) {
  return request<{ ok: boolean }>(`/api/assessments/notifications/${encodeURIComponent(id)}/read`, {
    method: "POST",
  });
}

export function markAllNotificationsReadApi() {
  return request<{ ok: boolean }>("/api/assessments/notifications/read-all", {
    method: "POST",
  });
}

export function dispatchSlaReminders() {
  return request<{ sent: number }>("/api/assessments/reminders/dispatch", {
    method: "POST",
  });
}

export type SlaStageSetting = {
  label: string;
  owner: string;
  openFrom: string;
  dueOn: string;
};

export type SlaCampaignSettings = {
  stages: Record<string, SlaStageSetting>;
};

export type InitialCheckDigestSettings = {
  enabled: boolean;
  timezone: string;
  scheduleTimes: string[];
  scheduleDates: string[];
  activeFrom: string;
  activeTo: string;
  recipientIds: string[];
  extraEmails: string;
  subject: string;
  bodyIntro: string;
  bodyOutro: string;
  lastAutoSentKey?: string | null;
  lastAutoSentAt?: string | null;
};

export function fetchSlaCampaign() {
  return request<SlaCampaignSettings>("/api/settings/sla");
}

export function saveSlaCampaign(input: SlaCampaignSettings) {
  return request<SlaCampaignSettings>("/api/settings/sla", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function fetchInitialCheckDigest() {
  return request<InitialCheckDigestSettings>("/api/settings/initial-check-digest");
}

export function saveInitialCheckDigest(input: Partial<InitialCheckDigestSettings>) {
  return request<InitialCheckDigestSettings>("/api/settings/initial-check-digest", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function dispatchInitialCheckDigest() {
  return request<{
    sent: boolean;
    recipientCount: number;
    pendingCount: number;
    recipients: string[];
    trigger: string;
  }>("/api/settings/initial-check-digest/dispatch", {
    method: "POST",
  });
}

export function fetchMasterUsers(query = "", page = 1, limit = 10000) {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    limit: String(limit),
  });
  return request<{
    total: number;
    page: number;
    limit: number;
    lastSyncedAt: string | null;
    lastCount: number;
    lastError: string | null;
    users: MasterUser[];
  }>(`/api/users?${params.toString()}`);
}

export function fetchMasterUser(id: string) {
  return request<{ user: MasterUser; fields: MasterUserField[] }>(
    `/api/users/${encodeURIComponent(id)}`,
  );
}

export function syncMasterUsers() {
  return request<{ message: string; count: number }>("/api/users/sync", {
    method: "POST",
  });
}

export type PublicSsoProvider = {
  provider: string;
  displayName: string | null;
  iconUrl: string | null;
  sortOrder: number;
};

export type SsoProvider = {
  id: number;
  provider: string;
  displayName: string | null;
  iconUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  clientId: string;
  clientSecret: string;
  hasClientSecret: boolean;
  redirectUri: string;
  frontendBaseUrl: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  discoveryUrl: string;
  scopes: string;
};

export type SsoProviderInput = {
  provider: string;
  displayName?: string;
  iconUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  frontendBaseUrl?: string;
  discoveryUrl?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  scopes?: string;
};

export function fetchPublicSsoProviders() {
  return request<PublicSsoProvider[]>("/auth/sso-providers");
}

export function fetchSsoProviders() {
  return request<{ providers: SsoProvider[] }>("/api/sso-providers");
}

export function createSsoProvider(input: SsoProviderInput) {
  return request<{ provider: SsoProvider }>("/api/sso-providers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateSsoProvider(id: number, input: Partial<SsoProviderInput>) {
  return request<{ provider: SsoProvider }>(`/api/sso-providers/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteSsoProvider(id: number) {
  return request<{ ok: boolean }>(`/api/sso-providers/${id}`, {
    method: "DELETE",
  });
}
