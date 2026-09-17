import { useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import PageHeader from "@/components/base/PageHeader";
import { SectionCard } from "@/components/base/Card";
import { Badge } from "@/components/base/Badge";
import StatCard from "@/components/base/StatCard";
import Button from "@/components/base/Button";
import Modal from "@/components/base/Modal";
import EmptyState from "@/components/base/EmptyState";
import Avatar from "@/components/base/Avatar";
import Pagination from "@/components/base/Pagination";
import { useApp } from "@/store/AppContext";
import { useToast } from "@/store/ToastContext";
import { usePagination } from "@/hooks/usePagination";
import { fetchMasterUser } from "@/services/api";
import { formatDateTime } from "@/lib/utils";
import type { MasterUser, MasterUserField } from "@/types/domain";

function display(value?: string | null) {
  return value?.trim() ? value : "—";
}

function fieldHaystack(user: MasterUser) {
  const payload = user.payload || {};
  return [
    user.name,
    user.email,
    user.employeeCode,
    user.department,
    user.designation,
    user.company,
    user.location,
    user.phone,
    user.managerName,
    user.role,
    user.status,
    payload.department,
    payload.function,
    payload.function_name,
    payload.functionName,
    payload.business_unit,
    payload.businessUnit,
    payload.company,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesLabel(user: MasterUser, label: string, prefer: "department" | "company") {
  const needle = label.trim().toLowerCase();
  if (!needle) return true;
  const primary =
    prefer === "department"
      ? (user.department || "").toLowerCase()
      : (user.company || "").toLowerCase();
  if (primary === needle || primary.includes(needle) || needle.includes(primary)) {
    if (primary) return true;
  }
  return fieldHaystack(user).includes(needle);
}

export default function UsersPage() {
  const {
    currentUser,
    masterUsers,
    masterUserTotal,
    masterLastSyncedAt,
    masterLastError,
    refreshMasterUsers,
    syncMasterUsers,
  } = useApp();
  const { pushToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const departmentFilter = searchParams.get("department")?.trim() || "";
  const companyFilter = searchParams.get("company")?.trim() || "";
  const [query, setQuery] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [selected, setSelected] = useState<MasterUser | null>(null);
  const [fields, setFields] = useState<MasterUserField[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return masterUsers.filter((user) => {
      if (departmentFilter && !matchesLabel(user, departmentFilter, "department")) {
        return false;
      }
      if (companyFilter && !matchesLabel(user, companyFilter, "company")) {
        return false;
      }
      if (q && !fieldHaystack(user).includes(q)) return false;
      return true;
    });
  }, [masterUsers, query, departmentFilter, companyFilter]);

  const paging = usePagination(filtered, {
    resetKey: `${query}|${departmentFilter}|${companyFilter}`,
  });

  const activeGroup = departmentFilter || companyFilter;
  const clearGroupFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("department");
    next.delete("company");
    setSearchParams(next);
  };

  const openUser = async (user: MasterUser) => {
    setSelected(user);
    setFields([]);
    setLoadingDetail(true);
    try {
      const detail = await fetchMasterUser(user.id);
      setSelected(detail.user);
      setFields(detail.fields);
    } catch {
      setSelected(user);
      setFields(
        Object.entries(user.payload || {}).map(([key, value]) => ({
          key,
          value:
            value === null || value === undefined
              ? "—"
              : typeof value === "object"
                ? JSON.stringify(value)
                : String(value),
        })),
      );
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const count = await syncMasterUsers();
      pushToast({
        tone: "success",
        title: "User master refreshed",
        message: `${count} users loaded from RefexOne.`,
      });
    } catch (error) {
      pushToast({
        tone: "error",
        title: "Sync failed",
        message:
          error instanceof Error
            ? error.message
            : "Could not refresh users from RefexOne.",
      });
      await refreshMasterUsers().catch(() => undefined);
    } finally {
      setSyncing(false);
    }
  };

  if (currentUser?.role !== "ADMIN") {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="HR Admin"
        title="User master"
        description="Full employee directory synced from RefexOne. Open any row to see every field returned by the source API."
        actions={
          <Button
            icon="ri-refresh-line"
            loading={syncing}
            onClick={() => void handleSync()}
          >
            Sync from RefexOne
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-4">
        <StatCard
          label="Users in MySQL"
          value={masterUserTotal}
          icon="ri-team-line"
          tone="progress"
        />
        <StatCard
          label="Showing"
          value={filtered.length}
          icon="ri-filter-line"
          tone="accent"
        />
        <StatCard
          label="Last synced"
          value={masterLastSyncedAt ? "Updated" : "Never"}
          hint={masterLastSyncedAt ? formatDateTime(masterLastSyncedAt) : "Sync from RefexOne to load users"}
          icon="ri-time-line"
        />
        <StatCard
          label="Source"
          value="RefexOne"
          icon="ri-database-2-line"
          tone="success"
        />
      </div>

      {activeGroup && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2.5">
          <p className="text-sm text-foreground-800">
            Showing users in{" "}
            <span className="font-semibold">
              {departmentFilter || companyFilter}
            </span>
            {departmentFilter ? " (department)" : " (business unit)"}.
          </p>
          <div className="flex items-center gap-2">
            <Link
              to="/app/analytics"
              className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1.5 font-label text-xs font-medium text-primary-700 hover:bg-primary-100"
            >
              <i className="ri-arrow-left-line text-sm" />
              Back to analytics
            </Link>
            <button
              type="button"
              onClick={clearGroupFilter}
              className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1.5 font-label text-xs font-medium text-foreground-700 hover:bg-background-100"
            >
              Clear filter
            </button>
          </div>
        </div>
      )}
      {masterLastError && (
        <p className="rounded-lg border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-800">
          Last sync warning: {masterLastError}
        </p>
      )}

      <SectionCard
        title="All users"
        description="Click a row to inspect the complete user record."
        icon="ri-user-search-line"
        bodyClassName="p-0"
        action={
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email, code, department"
            className="h-9 w-full rounded-md border border-background-300 bg-background-50 px-3 font-label text-sm text-foreground-900 placeholder:text-foreground-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 sm:w-80"
          />
        }
      >
        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon="ri-user-unfollow-line"
              title="No users loaded yet"
              description="Sign-in syncs RefexOne automatically. If the list is empty, use Sync from RefexOne."
              action={
                <Button
                  icon="ri-refresh-line"
                  loading={syncing}
                  onClick={() => void handleSync()}
                >
                  Sync now
                </Button>
              }
            />
          </div>
        ) : (
          <>
          <div className="overflow-x-auto scrollbar-slim">
            <table className="w-full min-w-[1100px] text-left">
              <thead>
                <tr className="border-b border-background-200">
                  {[
                    "User",
                    "Employee code",
                    "Department",
                    "Designation",
                    "Company",
                    "Location",
                    "Status",
                    "Manager",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-4 py-3 font-label text-xs font-semibold uppercase tracking-wide text-foreground-500"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paging.pageItems.map((user) => (
                  <tr
                    key={user.id}
                    className="cursor-pointer border-b border-background-100 hover:bg-primary-50/60"
                    onClick={() => void openUser(user)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-foreground-900">
                            {user.name}
                          </p>
                          <p className="text-xs text-foreground-500">
                            {display(user.email)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground-700">
                      {display(user.employeeCode)}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground-700">
                      {display(user.department)}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground-700">
                      {display(user.designation)}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground-700">
                      {display(user.company)}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground-700">
                      {display(user.location)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          (user.status || "").toLowerCase().includes("inactive")
                            ? "danger"
                            : "progress"
                        }
                      >
                        {display(user.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground-700">
                      {display(user.managerName)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={paging.page}
            pageSize={paging.pageSize}
            totalItems={paging.totalItems}
            totalPages={paging.totalPages}
            from={paging.from}
            to={paging.to}
            onPageChange={paging.setPage}
            onPageSizeChange={paging.setPageSize}
            itemLabel="users"
          />
          </>
        )}
      </SectionCard>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.name || "User"}
        description="Complete record from RefexOne user-master."
        size="xl"
        footer={
          <Button variant="outline" onClick={() => setSelected(null)}>
            Close
          </Button>
        }
      >
        {selected && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                ["Employee code", selected.employeeCode],
                ["Email", selected.email],
                ["Phone", selected.phone],
                ["Designation", selected.designation],
                ["Department", selected.department],
                ["Role", selected.role],
                ["Company", selected.company],
                ["Location", selected.location],
                ["Manager", selected.managerName],
                ["Date of joining", selected.dateOfJoining],
                ["Status", selected.status],
                ["User ID", selected.id],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md bg-background-100 px-3 py-2">
                  <p className="font-label text-[11px] font-semibold uppercase tracking-wide text-foreground-500">
                    {label}
                  </p>
                  <p className="mt-1 break-all text-sm text-foreground-900">
                    {display(value)}
                  </p>
                </div>
              ))}
            </div>

            <div>
              <h4 className="font-label text-sm font-semibold text-foreground-900">
                Full source data
              </h4>
              {loadingDetail ? (
                <p className="mt-3 text-sm text-foreground-600">Loading fields…</p>
              ) : (
                <div className="mt-3 overflow-hidden rounded-lg border border-background-200">
                  <table className="w-full text-left">
                    <tbody>
                      {fields.map((field) => (
                        <tr
                          key={field.key}
                          className="border-b border-background-100 last:border-0"
                        >
                          <td className="w-[38%] px-3 py-2 align-top font-label text-xs font-semibold text-foreground-600">
                            {field.key}
                          </td>
                          <td className="px-3 py-2 break-all text-sm text-foreground-900">
                            {field.value || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
