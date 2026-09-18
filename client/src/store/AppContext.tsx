import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AlignmentStatus,
  Assessment,
  AuditAction,
  AuditEntry,
  Employee,
  InitialClarityResponse,
  MasterUser,
  Notification,
  Reminder,
  User,
} from "@/types/domain";
import { nowIso, uid } from "@/lib/utils";
import { setRuntimeSlaStages } from "@/lib/sla";
import { visibleAssessmentsFor } from "@/services/assessmentService";
import {
  fetchCurrentAdmin,
  fetchEmployees,
  fetchMasterUsers,
  fetchAssessmentAudit,
  fetchWorkspace,
  fetchSlaCampaign,
  getToken,
  loginAdmin,
  markAllNotificationsReadApi,
  markNotificationReadApi,
  postAlignment,
  postAlignmentConversation,
  postHodSignoff,
  postInitialClarity,
  postManagerDraft,
  postManagerSubmit,
  postSelfDraft,
  postSelfSubmit,
  setToken,
  syncMasterUsers as syncMasterUsersApi,
} from "@/services/api";
import type {
  ManagerAssessmentInput,
  SelfAssessmentInput,
  WorkflowResult,
} from "@/services/workflowService";

const SESSION_KEY = "jcs.currentUserId";
const SESSION_USER_KEY = "jcs.currentUser";

interface AuditInput {
  assessmentId: string;
  actor: User;
  action: AuditAction;
  fromStatus: WorkflowStatus | null;
  toStatus: WorkflowStatus | null;
  comment?: string;
}

interface NotificationInput {
  assessmentId: string;
  recipientId: string;
  recipientName: string;
  event: Notification["event"];
  title: string;
  message: string;
}

interface AppContextValue {
  users: User[];
  employees: Employee[];
  assessments: Assessment[];
  auditLogs: AuditEntry[];
  notifications: Notification[];
  reminders: Reminder[];
  currentUser: User | null;
  authReady: boolean;
  masterUsers: MasterUser[];
  masterUserTotal: number;
  masterLastSyncedAt: string | null;
  masterLastError: string | null;
  login: (
    email: string,
    password: string,
  ) => Promise<{ user: User; redirectTo: string }>;
  loginWithToken: (
    token: string,
    user?: User | null,
  ) => Promise<{ user: User; redirectTo: string }>;
  logout: () => void;
  refreshEmployees: () => Promise<void>;
  refreshMasterUsers: (query?: string) => Promise<void>;
  syncMasterUsers: () => Promise<number>;
  upsertEmployee: (employee: Employee) => void;
  employeeById: (id?: string | null) => Employee | undefined;
  userById: (id?: string | null) => User | undefined;
  assessmentById: (id?: string | null) => Assessment | undefined;
  myAssessments: Assessment[];
  myNotifications: Notification[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  updateAssessment: (id: string, patch: Partial<Assessment>) => void;
  logAudit: (input: AuditInput) => void;
  pushNotification: (input: NotificationInput) => void;
  addReminder: (reminder: Omit<Reminder, "id">) => void;
  auditForAssessment: (assessmentId: string) => AuditEntry[];
  loadAudit: (assessmentId: string) => Promise<void>;
  submitInitialClarity: (
    assessment: Assessment,
    response: InitialClarityResponse,
  ) => Promise<WorkflowResult | null>;
  saveSelfAssessmentDraft: (
    assessment: Assessment,
    input: SelfAssessmentInput,
  ) => Promise<WorkflowResult | null>;
  submitSelfAssessment: (
    assessment: Assessment,
    input: SelfAssessmentInput,
  ) => Promise<WorkflowResult | null>;
  saveManagerAssessmentDraft: (
    assessment: Assessment,
    input: ManagerAssessmentInput,
  ) => Promise<WorkflowResult | null>;
  submitManagerAssessment: (
    assessment: Assessment,
    input: ManagerAssessmentInput,
  ) => Promise<WorkflowResult | null>;
  submitAlignmentDecision: (
    assessment: Assessment,
    decision: Exclude<AlignmentStatus, "PENDING">,
  ) => Promise<WorkflowResult | null>;
  submitAlignmentConversation: (
    assessment: Assessment,
    input: { hodComments?: string; hrbpComments?: string; complete?: boolean },
  ) => Promise<WorkflowResult | null>;
  submitHodSignoff: (
    assessment: Assessment,
    comments: string,
  ) => Promise<WorkflowResult | null>;
}

const AppContext = createContext<AppContextValue | null>(null);

function readStoredUser(): User | null {
  try {
    const raw = window.localStorage.getItem(SESSION_USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() =>
    getToken() ? readStoredUser() : null,
  );
  const [authReady, setAuthReady] = useState(!getToken());
  const [masterUsers, setMasterUsers] = useState<MasterUser[]>([]);
  const [masterUserTotal, setMasterUserTotal] = useState(0);
  const [masterLastSyncedAt, setMasterLastSyncedAt] = useState<string | null>(
    null,
  );
  const [masterLastError, setMasterLastError] = useState<string | null>(null);

  const persistUser = useCallback((user: User | null) => {
    setCurrentUser(user);
    try {
      if (user) {
        window.localStorage.setItem(SESSION_KEY, user.id);
        window.localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
      } else {
        window.localStorage.removeItem(SESSION_KEY);
        window.localStorage.removeItem(SESSION_USER_KEY);
      }
    } catch {
      /* storage unavailable */
    }
  }, []);

  const loadWorkspace = useCallback(async () => {
    const [result, sla] = await Promise.all([
      fetchWorkspace(),
      fetchSlaCampaign().catch(() => null),
    ]);
    if (sla?.stages) setRuntimeSlaStages(sla.stages);
    persistUser(result.user);
    setEmployees(result.employees);
    setAssessments(result.assessments);
    setNotifications(result.notifications);
    setUsers(
      result.employees.map((employee) => ({
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role:
          result.user.employeeId === employee.id
            ? result.user.role
            : ("EMPLOYEE" as const),
        employeeId: employee.id,
        title: employee.designation,
      })),
    );
    return result;
  }, [persistUser]);

  const refreshEmployees = useCallback(async () => {
    const result = await fetchEmployees();
    setEmployees(result.employees);
  }, []);

  const upsertEmployee = useCallback((employee: Employee) => {
    setEmployees((prev) => {
      const index = prev.findIndex((item) => item.id === employee.id);
      if (index < 0) return [...prev, employee];
      const next = [...prev];
      next[index] = employee;
      return next;
    });
  }, []);

  const refreshMasterUsers = useCallback(async (query = "") => {
    const result = await fetchMasterUsers(query);
    setMasterUsers(result.users);
    setMasterUserTotal(result.total);
    setMasterLastSyncedAt(result.lastSyncedAt);
    setMasterLastError(result.lastError);
  }, []);

  const syncMasterUsers = useCallback(async () => {
    const result = await syncMasterUsersApi();
    await refreshMasterUsers();
    return result.count;
  }, [refreshMasterUsers]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginAdmin(email, password);
      setToken(result.token);
      persistUser(result.user);
      const workspace = await loadWorkspace();
      if (result.user.role === "ADMIN") {
        try {
          await refreshMasterUsers();
        } catch {
          /* user list can be refreshed from the users screen */
        }
      }
      return { user: workspace.user, redirectTo: workspace.redirectTo };
    },
    [persistUser, refreshMasterUsers, loadWorkspace],
  );

  const loginWithToken = useCallback(
    async (token: string, user?: User | null) => {
      setToken(token);
      if (user) persistUser(user);
      const workspace = await loadWorkspace();
      if (workspace.user.role === "ADMIN") {
        try {
          await refreshMasterUsers();
        } catch {
          /* ignore */
        }
      }
      return { user: workspace.user, redirectTo: workspace.redirectTo };
    },
    [persistUser, refreshMasterUsers, loadWorkspace],
  );

  const logout = useCallback(() => {
    setToken(null);
    persistUser(null);
    setMasterUsers([]);
    setMasterUserTotal(0);
    setMasterLastSyncedAt(null);
    setMasterLastError(null);
    setEmployees([]);
    setAssessments([]);
    setNotifications([]);
    setUsers([]);
    setAuditLogs([]);
  }, [persistUser]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      persistUser(null);
      setAuthReady(true);
      return;
    }

    let cancelled = false;
    fetchCurrentAdmin()
      .then(async ({ user }) => {
        if (cancelled) return;
        persistUser(user);
        try {
          await loadWorkspace();
        } catch {
          /* workspace can retry after navigation */
        }
        if (user.role === "ADMIN") {
          try {
            await refreshMasterUsers();
          } catch {
            /* ignore; users page can retry */
          }
        }
      })
      .catch(() => {
        if (cancelled) return;
        setToken(null);
        persistUser(null);
      })
      .finally(() => {
        if (!cancelled) setAuthReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [persistUser, refreshMasterUsers, loadWorkspace]);

  const employeeById = useCallback(
    (id?: string | null) => employees.find((e) => e.id === id),
    [employees],
  );

  const userById = useCallback(
    (id?: string | null) => users.find((u) => u.id === id),
    [users],
  );

  const assessmentById = useCallback(
    (id?: string | null) => assessments.find((a) => a.id === id),
    [assessments],
  );

  const myAssessments = useMemo(
    () => visibleAssessmentsFor(currentUser, assessments),
    [currentUser, assessments],
  );

  const myNotifications = useMemo(
    () =>
      currentUser
        ? notifications
            .filter((n) => n.recipientId === currentUser.id)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        : [],
    [currentUser, notifications],
  );

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    void markNotificationReadApi(id).catch(() => undefined);
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    if (!currentUser) return;
    setNotifications((prev) =>
      prev.map((n) =>
        n.recipientId === currentUser.id ? { ...n, read: true } : n,
      ),
    );
    void markAllNotificationsReadApi().catch(() => undefined);
  }, [currentUser]);

  const updateAssessment = useCallback(
    (id: string, patch: Partial<Assessment>) => {
      setAssessments((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, ...patch, updatedAt: nowIso() } : a,
        ),
      );
    },
    [],
  );

  const logAudit = useCallback((input: AuditInput) => {
    const entry: AuditEntry = {
      id: uid("AL"),
      assessmentId: input.assessmentId,
      actorId: input.actor.id,
      actorName: input.actor.name,
      actorRole: input.actor.role,
      action: input.action,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      comment: input.comment ?? "",
      createdAt: nowIso(),
    };
    setAuditLogs((prev) => [entry, ...prev]);
  }, []);

  const pushNotification = useCallback((input: NotificationInput) => {
    const entry: Notification = {
      id: uid("NT"),
      ...input,
      createdAt: nowIso(),
      read: false,
    };
    setNotifications((prev) => [entry, ...prev]);
  }, []);

  const addReminder = useCallback((reminder: Omit<Reminder, "id">) => {
    setReminders((prev) => [{ id: uid("RM"), ...reminder }, ...prev]);
  }, []);

  const auditForAssessment = useCallback(
    (assessmentId: string) =>
      auditLogs
        .filter((l) => l.assessmentId === assessmentId)
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
    [auditLogs],
  );

  const loadAudit = useCallback(async (assessmentId: string) => {
    const result = await fetchAssessmentAudit(assessmentId);
    setAuditLogs((prev) => {
      const others = prev.filter((item) => item.assessmentId !== assessmentId);
      return [...result.auditLogs, ...others];
    });
  }, []);

  const upsertAssessment = useCallback((assessment: Assessment) => {
    setAssessments((prev) => {
      const exists = prev.some((item) => item.id === assessment.id);
      return exists
        ? prev.map((item) => (item.id === assessment.id ? assessment : item))
        : [assessment, ...prev];
    });
  }, []);

  const toastResult = (
    title: string,
    message: string,
    tone: WorkflowResult["toastTone"] = "success",
  ): WorkflowResult => ({
    patch: {},
    auditAction: "SELF_ASSESSMENT_SAVED",
    auditComment: "",
    notifications: [],
    toastTone: tone,
    toastTitle: title,
    toastMessage: message,
  });

  const submitInitialClarity = useCallback(
    async (assessment: Assessment, response: InitialClarityResponse) => {
      if (!currentUser) return null;
      const result = await postInitialClarity(assessment.id, response);
      upsertAssessment(result.assessment);
      if (response === "YES") {
        return toastResult(
          "Role Clarity Confirmed",
          "You have indicated that you have clarity on your current role and expectations. No further action is required from you at this stage.",
        );
      }
      if (response === "NO") {
        return toastResult(
          "Role Clarity Assessment Required",
          "You have indicated that you do not currently have sufficient clarity on your role and expectations. Please complete the detailed Role Clarity Self-Assessment to identify the areas requiring clarification.",
        );
      }
      return toastResult(
        "Role Clarity Assessment – Further Clarification Required",
        "You have indicated that you have partial clarity on your role. Please complete the Role Clarity Self-Assessment and identify the specific areas where you require further clarification or alignment.",
      );
    },
    [currentUser, upsertAssessment],
  );

  const saveSelfAssessmentDraft = useCallback(
    async (assessment: Assessment, input: SelfAssessmentInput) => {
      if (!currentUser) return null;
      const result = await postSelfDraft(assessment.id, input);
      upsertAssessment(result.assessment);
      return toastResult("Draft saved", "Your self assessment progress was saved.", "info");
    },
    [currentUser, upsertAssessment],
  );

  const submitSelfAssessment = useCallback(
    async (assessment: Assessment, input: SelfAssessmentInput) => {
      if (!currentUser) return null;
      const result = await postSelfSubmit(assessment.id, input);
      upsertAssessment(result.assessment);
      return toastResult(
        "Role Clarity Assessment Awaiting Your Action",
        "The Role Clarity Self-Assessment has been submitted. Your reporting manager has been asked to complete an independent assessment.",
      );
    },
    [currentUser, upsertAssessment],
  );

  const submitManagerAssessment = useCallback(
    async (assessment: Assessment, input: ManagerAssessmentInput) => {
      if (!currentUser) return null;
      const result = await postManagerSubmit(assessment.id, input);
      upsertAssessment(result.assessment);
      return toastResult(
        "Manager assessment submitted",
        "The case is now with the employee for alignment confirmation.",
      );
    },
    [currentUser, upsertAssessment],
  );

  const saveManagerAssessmentDraft = useCallback(
    async (assessment: Assessment, input: ManagerAssessmentInput) => {
      if (!currentUser) return null;
      const result = await postManagerDraft(assessment.id, input);
      upsertAssessment(result.assessment);
      return toastResult("Draft saved", "Your manager assessment was saved.", "info");
    },
    [currentUser, upsertAssessment],
  );

  const submitAlignmentDecision = useCallback(
    async (
      assessment: Assessment,
      decision: Exclude<AlignmentStatus, "PENDING">,
    ) => {
      if (!currentUser) return null;
      const result = await postAlignment(assessment.id, decision);
      upsertAssessment(result.assessment);
      return decision === "NOT_ALIGNED"
        ? toastResult(
            "Role Alignment Conversation Required",
            "The employee has indicated that the role expectations and clarifications provided are not yet fully aligned with their understanding of the role. A Role Alignment Conversation involving the Employee, Reporting Manager, HOD and HRBP is required to establish a shared understanding of the role and expectations.",
          )
        : toastResult(
            "Role Alignment Confirmed",
            "You have confirmed that the role expectations and clarifications provided by your Reporting Manager are aligned with your understanding. The assessment has now been routed to the HOD for final sign-off.",
          );
    },
    [currentUser, upsertAssessment],
  );

  const submitAlignmentConversation = useCallback(
    async (
      assessment: Assessment,
      input: { hodComments?: string; hrbpComments?: string; complete?: boolean },
    ) => {
      if (!currentUser) return null;
      const result = await postAlignmentConversation(assessment.id, input);
      upsertAssessment(result.assessment);
      return input.complete
        ? toastResult(
            "Alignment Conversation Completed – HOD Closure Required",
            "The Role Alignment Conversation has been completed. Please record the final outcome/comments and provide HOD sign-off to close the Role Clarity Review.",
          )
        : toastResult("Notes saved", "Conversation notes were saved.", "info");
    },
    [currentUser, upsertAssessment],
  );

  const submitHodSignoff = useCallback(
    async (assessment: Assessment, comments: string) => {
      if (!currentUser) return null;
      const result = await postHodSignoff(assessment.id, comments);
      upsertAssessment(result.assessment);
      return toastResult(
        "Role Clarity Review Completed",
        "The Role Clarity Review has been completed and formally signed off by the HOD.",
      );
    },
    [currentUser, upsertAssessment],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      users,
      employees,
      assessments,
      auditLogs,
      notifications,
      reminders,
      currentUser,
      authReady,
      masterUsers,
      masterUserTotal,
      masterLastSyncedAt,
      masterLastError,
      login,
      loginWithToken,
      logout,
      refreshEmployees,
      refreshMasterUsers,
      syncMasterUsers,
      upsertEmployee,
      employeeById,
      userById,
      assessmentById,
      myAssessments,
      myNotifications,
      markNotificationRead,
      markAllNotificationsRead,
      updateAssessment,
      logAudit,
      pushNotification,
      addReminder,
      auditForAssessment,
      loadAudit,
      submitInitialClarity,
      saveSelfAssessmentDraft,
      submitSelfAssessment,
      saveManagerAssessmentDraft,
      submitManagerAssessment,
      submitAlignmentDecision,
      submitAlignmentConversation,
      submitHodSignoff,
    }),
    [
      users,
      employees,
      assessments,
      auditLogs,
      notifications,
      reminders,
      currentUser,
      authReady,
      masterUsers,
      masterUserTotal,
      masterLastSyncedAt,
      masterLastError,
      login,
      loginWithToken,
      logout,
      refreshEmployees,
      refreshMasterUsers,
      syncMasterUsers,
      upsertEmployee,
      employeeById,
      userById,
      assessmentById,
      myAssessments,
      myNotifications,
      markNotificationRead,
      markAllNotificationsRead,
      updateAssessment,
      logAudit,
      pushNotification,
      addReminder,
      auditForAssessment,
      loadAudit,
      submitInitialClarity,
      saveSelfAssessmentDraft,
      submitSelfAssessment,
      saveManagerAssessmentDraft,
      submitManagerAssessment,
      submitAlignmentDecision,
      submitAlignmentConversation,
      submitHodSignoff,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}