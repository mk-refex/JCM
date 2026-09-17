import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageHeader from "@/components/base/PageHeader";
import { SectionCard } from "@/components/base/Card";
import AssessmentTable from "@/components/feature/AssessmentTable";
import EmptyState from "@/components/base/EmptyState";
import { useApp } from "@/store/AppContext";
import { derivedRag, effectiveSla } from "@/lib/metrics";
import { WORKFLOW_STATUS_META } from "@/constants/clarity";
import type { Assessment, WorkflowStatus } from "@/types/domain";
import { cn } from "@/lib/utils";

interface AssessmentExplorerProps {
  assessments: Assessment[];
  eyebrow?: string;
  title: string;
  description?: string;
  showAlignment?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  serverHideEmployeeResponses?: boolean;
}

const ALL = "__all__";
const BLANK = "__blank__";

function matchesNamedGroup(actual: string | undefined, wanted: string) {
  if (!wanted) return true;
  const value = (actual || "").trim();
  if (wanted === BLANK) return !value;
  return value === wanted;
}

export default function AssessmentExplorer({
  assessments,
  eyebrow,
  title,
  description,
  showAlignment = false,
  emptyTitle,
  emptyDescription,
}: AssessmentExplorerProps) {
  const { employeeById } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [ragFilter, setRagFilter] = useState<string>(ALL);
  const [slaFilter, setSlaFilter] = useState<string>(ALL);

  const groupBu = searchParams.get("businessUnit")?.trim() || "";
  const groupFn = searchParams.get("function")?.trim() || "";
  const groupStatus = searchParams.get("status")?.trim() || "";
  const groupRag = searchParams.get("rag")?.trim() || "";
  const groupSla = searchParams.get("sla")?.trim() || "";
  const groupAlignment = searchParams.get("alignment")?.trim() || "";
  const groupConversation = searchParams.get("conversation") === "1";
  const hasGroupFilter = Boolean(
    groupBu ||
      groupFn ||
      groupStatus ||
      groupRag ||
      groupSla ||
      groupAlignment ||
      groupConversation,
  );

  const groupSummary = [
    groupBu &&
      `business unit ${groupBu === BLANK ? "(not set)" : groupBu}`,
    groupFn && `function ${groupFn === BLANK ? "(not set)" : groupFn}`,
    groupStatus && (WORKFLOW_STATUS_META[groupStatus as WorkflowStatus]?.label || groupStatus),
    groupRag && `${groupRag.toLowerCase()} RAG`,
    groupSla && groupSla.replaceAll("_", " ").toLowerCase(),
    groupAlignment && groupAlignment.replaceAll("_", " ").toLowerCase(),
    groupConversation && "alignment conversations",
  ].filter(Boolean) as string[];

  const statusOptions = useMemo(() => {
    const set = new Set<WorkflowStatus>();
    assessments.forEach((a) => set.add(a.status));
    return Array.from(set);
  }, [assessments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assessments.filter((a) => {
      const emp = employeeById(a.employeeId);
      if (!matchesNamedGroup(emp?.businessUnit, groupBu)) return false;
      if (!matchesNamedGroup(emp?.functionName, groupFn)) return false;
      if (groupStatus && a.status !== groupStatus) return false;
      if (groupRag && derivedRag(a) !== groupRag) return false;
      if (groupSla && effectiveSla(a) !== groupSla) return false;
      if (groupAlignment && a.alignmentStatus !== groupAlignment) return false;
      if (groupConversation && !a.alignmentConversation) return false;
      if (q) {
        const haystack = `${emp?.name ?? ""} ${emp?.empId ?? ""} ${a.code} ${
          emp?.designation ?? ""
        } ${emp?.businessUnit ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (statusFilter !== ALL && a.status !== statusFilter) return false;
      if (ragFilter !== ALL && derivedRag(a) !== ragFilter) return false;
      if (slaFilter !== ALL && effectiveSla(a) !== slaFilter) return false;
      return true;
    });
  }, [
    assessments,
    query,
    statusFilter,
    ragFilter,
    slaFilter,
    employeeById,
    groupBu,
    groupFn,
    groupStatus,
    groupRag,
    groupSla,
    groupAlignment,
    groupConversation,
  ]);

  const selectClass =
    "h-10 w-full min-w-0 cursor-pointer rounded-md border border-background-300 bg-background-50 px-3 font-label text-sm text-foreground-800 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 sm:w-auto";

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        breadcrumb={[
          { label: "Home", to: "/app/dashboard" },
          { label: title },
        ]}
        actions={
          <span className="inline-flex items-center gap-2 rounded-md border border-background-200 bg-background-100 px-3 py-2 font-label text-xs text-foreground-600">
            <i className="ri-file-list-3-line text-base" />
            {filtered.length} of {assessments.length} shown
          </span>
        }
      />

      {hasGroupFilter && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2.5">
          <p className="text-sm text-foreground-800">
            Showing{" "}
            <span className="font-semibold">{filtered.length}</span>{" "}
            {filtered.length === 1 ? "assessment" : "assessments"}
            {groupSummary.length ? ` for ${groupSummary.join(" · ")}` : ""}.
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
              onClick={() => setSearchParams({})}
              className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1.5 font-label text-xs font-medium text-foreground-700 hover:bg-background-100"
            >
              Clear filter
            </button>
          </div>
        </div>
      )}

      <SectionCard bodyClassName="p-0">
        <div className="flex flex-col gap-3 border-b border-background-200 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center text-foreground-400">
              <i className="ri-search-line text-base" />
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by employee, ID, reference or role"
              className="h-10 w-full rounded-md border border-background-300 bg-background-50 pl-9 pr-3 font-label text-sm text-foreground-900 placeholder:text-foreground-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={selectClass}
            >
              <option value={ALL}>All stages</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {WORKFLOW_STATUS_META[s].label}
                </option>
              ))}
            </select>

            <select
              value={ragFilter}
              onChange={(e) => setRagFilter(e.target.value)}
              className={selectClass}
            >
              <option value={ALL}>All RAG</option>
              <option value="GREEN">Green</option>
              <option value="AMBER">Amber</option>
              <option value="RED">Red</option>
            </select>

            <select
              value={slaFilter}
              onChange={(e) => setSlaFilter(e.target.value)}
              className={selectClass}
            >
              <option value={ALL}>All SLA</option>
              <option value="ON_TRACK">On track</option>
              <option value="DUE_SOON">Due soon</option>
              <option value="BREACHED">Breached</option>
              <option value="COMPLETED">Completed</option>
            </select>

            {(query ||
              statusFilter !== ALL ||
              ragFilter !== ALL ||
              slaFilter !== ALL) && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setStatusFilter(ALL);
                  setRagFilter(ALL);
                  setSlaFilter(ALL);
                }}
                className={cn(
                  "inline-flex h-10 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md px-3 font-label text-sm text-foreground-600 hover:bg-background-100",
                )}
              >
                <i className="ri-refresh-line text-base" />
                Reset
              </button>
            )}
          </div>
        </div>

        {filtered.length ? (
          <AssessmentTable
            assessments={filtered}
            showAlignment={showAlignment}
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
            resetKey={`${query}|${statusFilter}|${ragFilter}|${slaFilter}|${groupBu}|${groupFn}|${groupStatus}|${groupRag}|${groupSla}|${groupAlignment}|${groupConversation}`}
          />
        ) : (
          <div className="p-5">
            <EmptyState
              icon="ri-filter-off-line"
              title="No assessments match your filters"
              description="Try clearing the search or choosing a different stage, RAG or SLA filter."
            />
          </div>
        )}
      </SectionCard>
    </div>
  );
}