import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import PageHeader from "@/components/base/PageHeader";
import { SectionCard } from "@/components/base/Card";
import { Badge } from "@/components/base/Badge";
import StatCard from "@/components/base/StatCard";
import Modal from "@/components/base/Modal";
import Pagination from "@/components/base/Pagination";
import UserSearchSelect from "@/components/base/UserSearchSelect";
import { useApp } from "@/store/AppContext";
import { useToast } from "@/store/ToastContext";
import { usePagination } from "@/hooks/usePagination";
import {
  dispatchSlaReminders,
  importEmployeeHierarchy,
  updateEmployeeHierarchy,
} from "@/services/api";
import Button from "@/components/base/Button";
import {
  BUSINESS_UNITS,
  CLARITY_DIMENSIONS,
  DEPARTMENTS,
  GRADES,
  RATING_SCALE,
  ROLE_META,
  SHARED_SERVICES_FUNCTIONS,
} from "@/constants/clarity";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types/domain";
import SsoConfigPanel from "@/pages/admin/SsoConfigPanel";
import SlaConfigPanel from "@/pages/admin/SlaConfigPanel";
import InitialCheckDigestPanel from "@/pages/admin/InitialCheckDigestPanel";

const TABS = [
  { key: "employees", label: "Employees", icon: "ri-user-line" },
  { key: "users", label: "Users & Roles", icon: "ri-shield-user-line" },
  { key: "organisation", label: "Organisation", icon: "ri-building-2-line" },
  { key: "sla", label: "SLA & Notifications", icon: "ri-timer-line" },
  { key: "dimensions", label: "Dimensions & Scale", icon: "ri-list-check-2" },
  { key: "sso", label: "SSO config", icon: "ri-shield-keyhole-line" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function cellValue(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const found = Object.keys(row).find(
      (header) => header.trim().toLowerCase() === key.toLowerCase(),
    );
    if (found != null && row[found] != null && String(row[found]).trim() !== "") {
      return String(row[found]).trim();
    }
  }
  return "";
}

export default function AdminPage() {
  const { employees, users, refreshEmployees, upsertEmployee } = useApp();
  const { pushToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<TabKey>("employees");
  const [query, setQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [editHodId, setEditHodId] = useState<string | null>(null);
  const [editHrbpId, setEditHrbpId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);

  const filteredEmployees = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      `${e.name} ${e.empId} ${e.businessUnit} ${e.functionName} ${e.designation}`
        .toLowerCase()
        .includes(q),
    );
  }, [employees, query]);

  const employeePaging = usePagination(filteredEmployees, { resetKey: query });
  const usersPaging = usePagination(users);

  const employeeName = (id?: string | null) =>
    employees.find((e) => e.id === id)?.name ?? "—";

  const openEdit = (employee: Employee) => {
    setEditing(employee);
    setEditHodId(employee.hodId);
    setEditHrbpId(employee.hrbpId);
  };

  const closeEdit = () => {
    setEditing(null);
    setEditHodId(null);
    setEditHrbpId(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSavingEdit(true);
    try {
      const result = await updateEmployeeHierarchy(editing.id, {
        hodId: editHodId,
        hrbpId: editHrbpId,
      });
      upsertEmployee(result.employee);
      pushToast({
        tone: "success",
        title: "Employee updated",
        message: `HOD and HRBP saved for ${result.employee.name}.`,
      });
      closeEdit();
    } catch (error) {
      pushToast({
        tone: "error",
        title: "Update failed",
        message: error instanceof Error ? error.message : "Could not update employee.",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleImportFile = async (file: File) => {
    setImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });
      const rows = rawRows
        .map((row) => ({
          empId: cellValue(row, ["Employee ID", "EmployeeID", "empId", "Emp ID", "emp_id"]),
          hodCode: cellValue(row, ["HOD", "hod", "hodCode", "HOD ID", "HOD Code"]) || null,
          hrbpCode: cellValue(row, ["HRBP", "hrbp", "hrbpCode", "HRBP ID", "HRBP Code"]) || null,
        }))
        .filter((row) => row.empId);

      if (!rows.length) {
        pushToast({
          tone: "error",
          title: "Import failed",
          message: "No rows with Employee ID found in the Excel file.",
        });
        return;
      }

      const summary = await importEmployeeHierarchy(rows);
      await refreshEmployees();

      const issues =
        summary.notFound.length +
        summary.unresolvedHod.length +
        summary.unresolvedHrbp.length;
      pushToast({
        tone: issues ? "info" : "success",
        title: "Hierarchy import completed",
        message: `Updated ${summary.updated} of ${summary.total} rows. Skipped ${summary.skipped}.${
          summary.notFound.length
            ? ` Not found: ${summary.notFound.slice(0, 5).join(", ")}${summary.notFound.length > 5 ? "…" : ""}.`
            : ""
        }${
          summary.unresolvedHod.length
            ? ` Unresolved HOD: ${summary.unresolvedHod.length}.`
            : ""
        }${
          summary.unresolvedHrbp.length
            ? ` Unresolved HRBP: ${summary.unresolvedHrbp.length}.`
            : ""
        }`,
      });
    } catch (error) {
      pushToast({
        tone: "error",
        title: "Import failed",
        message:
          error instanceof Error ? error.message : "Could not import the Excel file.",
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="HR Admin"
        title="Master data & configuration"
        description="Manage employees, users and roles, organisation reference data, campaign SLA dates, notification settings and the role clarity dimensions."
      />

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-4">
        <StatCard label="Employees" value={employees.length} icon="ri-user-line" tone="progress" />
        <StatCard label="System users" value={users.length} icon="ri-shield-user-line" tone="accent" />
        <StatCard
          label="Business units"
          value={BUSINESS_UNITS.length}
          icon="ri-building-2-line"
          tone="success"
        />
        <StatCard
          label="Functions"
          value={SHARED_SERVICES_FUNCTIONS.length}
          icon="ri-organization-chart"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-background-200 bg-background-100 p-3">
        <div className="flex flex-wrap items-center gap-1">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cn(
                "inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 font-label text-sm transition-colors",
                tab === item.key
                  ? "bg-primary-500 text-white dark:text-foreground-950"
                  : "text-foreground-700 hover:bg-background-200",
              )}
            >
              <span className="flex h-4 w-4 items-center justify-center">
                <i className={cn(item.icon, "text-base")} />
              </span>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "employees" && (
        <SectionCard
          title="Employee master"
          description="Employee records used to pre-fill Section A of every self assessment. Import updates HOD and HRBP only — reporting manager stays synced from user master."
          icon="ri-team-line"
          bodyClassName="p-0"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImportFile(file);
                }}
              />
              <Button
                size="sm"
                variant="outline"
                icon="ri-upload-2-line"
                loading={importing}
                onClick={() => fileInputRef.current?.click()}
              >
                Import HOD / HRBP
              </Button>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search employees"
                className="h-9 w-full rounded-md border border-background-300 bg-background-50 px-3 font-label text-sm text-foreground-900 placeholder:text-foreground-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 sm:w-64"
              />
            </div>
          }
        >
          <div className="overflow-x-auto scrollbar-slim">
            <table className="w-full min-w-[1080px] text-left">
              <thead>
                <tr className="border-b border-background-200">
                  {[
                    "Employee",
                    "Business unit",
                    "Function",
                    "Designation",
                    "Grade",
                    "Reporting manager",
                    "HOD",
                    "HRBP",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 font-label text-xs font-semibold uppercase tracking-wide text-foreground-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employeePaging.pageItems.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-background-100 hover:bg-background-100/70"
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground-900">{e.name}</p>
                      <p className="text-xs text-foreground-500">{e.empId}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground-700">{e.businessUnit}</td>
                    <td className="px-4 py-3 text-sm text-foreground-700">{e.functionName}</td>
                    <td className="px-4 py-3 text-sm text-foreground-700">{e.designation}</td>
                    <td className="px-4 py-3">
                      <Badge tone="progress">{e.grade}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground-700">
                      {employeeName(e.managerId)}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground-700">
                      {employeeName(e.hodId)}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground-700">
                      {employeeName(e.hrbpId)}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="ri-edit-line"
                        onClick={() => openEdit(e)}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={employeePaging.page}
            pageSize={employeePaging.pageSize}
            totalItems={employeePaging.totalItems}
            totalPages={employeePaging.totalPages}
            from={employeePaging.from}
            to={employeePaging.to}
            onPageChange={employeePaging.setPage}
            onPageSizeChange={employeePaging.setPageSize}
            itemLabel="employees"
          />
        </SectionCard>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={closeEdit}
        title="Edit HOD & HRBP"
        description={
          editing
            ? `${editing.name} (${editing.empId}). Reporting manager is managed by user-master sync and cannot be changed here.`
            : undefined
        }
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={closeEdit} disabled={savingEdit}>
              Cancel
            </Button>
            <Button icon="ri-save-line" loading={savingEdit} onClick={() => void saveEdit()}>
              Save
            </Button>
          </>
        }
      >
        {editing && (
          <div className="flex flex-col gap-5">
            <div className="rounded-md border border-background-200 bg-background-100 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-foreground-500">
                Reporting manager (L1)
              </p>
              <p className="mt-1 text-sm text-foreground-800">
                {employeeName(editing.managerId)}
              </p>
            </div>
            <UserSearchSelect
              label="HOD"
              value={editHodId}
              employees={employees}
              excludeId={editing.id}
              onChange={setEditHodId}
            />
            <UserSearchSelect
              label="HRBP"
              value={editHrbpId}
              employees={employees}
              excludeId={editing.id}
              onChange={setEditHrbpId}
            />
          </div>
        )}
      </Modal>

      {tab === "users" && (
        <SectionCard
          title="Users & roles"
          description="Role based access control is enforced per record on every action."
          icon="ri-shield-user-line"
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto scrollbar-slim">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-background-200">
                  {["User", "Email", "Role", "Linked employee"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 font-label text-xs font-semibold uppercase tracking-wide text-foreground-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usersPaging.pageItems.map((u) => (
                  <tr key={u.id} className="border-b border-background-100">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground-900">{u.name}</p>
                      <p className="text-xs text-foreground-500">{u.title}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground-700">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge tone={u.role === "ADMIN" ? "danger" : "progress"}>
                        {ROLE_META[u.role].short}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground-700">
                      {u.employeeId ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={usersPaging.page}
            pageSize={usersPaging.pageSize}
            totalItems={usersPaging.totalItems}
            totalPages={usersPaging.totalPages}
            from={usersPaging.from}
            to={usersPaging.to}
            onPageChange={usersPaging.setPage}
            onPageSizeChange={usersPaging.setPageSize}
            itemLabel="users"
          />
        </SectionCard>
      )}

      {tab === "organisation" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SectionCard
            title="Business units"
            description={`${BUSINESS_UNITS.length} business units in the group.`}
            icon="ri-building-2-line"
          >
            <ul className="flex flex-wrap gap-2">
              {BUSINESS_UNITS.map((b) => (
                <li key={b}>
                  <Badge tone="progress">{b}</Badge>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard
            title="Shared services functions"
            description={`${SHARED_SERVICES_FUNCTIONS.length} shared services functions.`}
            icon="ri-organization-chart"
          >
            <ul className="flex flex-wrap gap-2">
              {SHARED_SERVICES_FUNCTIONS.map((f) => (
                <li key={f}>
                  <Badge tone="accent">{f}</Badge>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Departments" description="Reference list for role mapping." icon="ri-node-tree">
            <ul className="flex flex-wrap gap-2">
              {DEPARTMENTS.map((d) => (
                <li key={d}>
                  <Badge>{d}</Badge>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Grades / bands" description="Grade structure used in Section A." icon="ri-medal-line">
            <ul className="flex flex-wrap gap-2">
              {GRADES.map((g) => (
                <li key={g}>
                  <Badge tone="success">{g}</Badge>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      )}

      {tab === "sla" && (
        <div className="flex flex-col gap-6">
          <SlaConfigPanel />
          <InitialCheckDigestPanel />
          <SectionCard
            title="Stage due / breach reminders"
            description="Send the existing per-case SLA reminders to employees, managers or HODs whose current stage is due soon or breached."
            icon="ri-alarm-warning-line"
          >
            <p className="mb-4 text-xs text-foreground-600">
              Separate from the Initial Check digest above. This targets people who
              already started a stage but have not completed it by the due date.
            </p>
            <Button
              icon="ri-mail-send-line"
              loading={sendingReminders}
              onClick={() => {
                setSendingReminders(true);
                void dispatchSlaReminders()
                  .then((result) => {
                    pushToast({
                      tone: "success",
                      title: "Reminder: Role Clarity Action Pending",
                      message: `${result.sent} reminder${result.sent === 1 ? "" : "s"} dispatched for due or overdue actions.`,
                    });
                  })
                  .catch((error) => {
                    pushToast({
                      tone: "error",
                      title: "Reminders failed",
                      message:
                        error instanceof Error
                          ? error.message
                          : "Could not dispatch SLA reminders.",
                    });
                  })
                  .finally(() => setSendingReminders(false));
              }}
            >
              Send pending SLA reminders
            </Button>
          </SectionCard>
        </div>
      )}

      {tab === "dimensions" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <SectionCard
            title="The 7 clarity dimensions"
            description="Definitions are taken directly from the organisation's Job Clarity template."
            icon="ri-list-check-2"
            className="lg:col-span-2"
          >
            <ol className="flex flex-col gap-4">
              {CLARITY_DIMENSIONS.map((d) => (
                <li
                  key={d.key}
                  className="rounded-md border border-background-200 bg-background-100 p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 font-label text-xs font-semibold text-primary-700">
                      {d.order}
                    </span>
                    <div>
                      <p className="font-label text-sm font-semibold text-foreground-950">
                        {d.name}
                      </p>
                      <p className="mt-1 text-sm text-foreground-700">
                        {d.definition}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </SectionCard>

          <SectionCard
            title="Rating scale"
            description="1–5 scale used by both the employee and the manager."
            icon="ri-star-line"
          >
            <ol className="flex flex-col gap-3">
              {RATING_SCALE.map((r) => (
                <li
                  key={r.score}
                  className="rounded-md border border-background-200 bg-background-100 p-3"
                >
                  <div className="flex items-center gap-2">
                    <Badge tone="accent">{r.score}</Badge>
                    <span className="font-label text-sm font-semibold text-foreground-900">
                      {r.label}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-foreground-600">
                    {r.definition}
                  </p>
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>
      )}

      {tab === "sso" && <SsoConfigPanel />}
    </div>
  );
}
