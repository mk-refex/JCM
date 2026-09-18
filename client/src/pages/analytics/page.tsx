import { useMemo, useState, type KeyboardEvent } from "react";
import PageHeader from "@/components/base/PageHeader";
import StatCard from "@/components/base/StatCard";
import { SectionCard } from "@/components/base/Card";
import { Badge } from "@/components/base/Badge";
import EmptyState from "@/components/base/EmptyState";
import Pagination from "@/components/base/Pagination";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/store/AppContext";
import { usePagination } from "@/hooks/usePagination";
import { computeMetrics, derivedRag, effectiveSla, scoreLabel } from "@/lib/metrics";
import { WORKFLOW_STATUS_META } from "@/constants/clarity";
import type { WorkflowStatus } from "@/types/domain";

const ALL = "__all__";

export default function AnalyticsPage() {
  const { assessments, employeeById, employees } = useApp();
  const navigate = useNavigate();
  const [bu, setBu] = useState(ALL);
  const [fn, setFn] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [rag, setRag] = useState(ALL);

  const assessmentsPath = (overrides: Record<string, string | undefined> = {}) => {
    const values: Record<string, string> = {};
    if (bu !== ALL) values.businessUnit = bu;
    if (fn !== ALL) values.function = fn;
    if (status !== ALL) values.status = status;
    if (rag !== ALL) values.rag = rag;
    for (const [key, value] of Object.entries(overrides)) {
      if (!value) delete values[key];
      else values[key] = value;
    }
    const params = new URLSearchParams(values);
    const query = params.toString();
    return query ? `/app/assessments?${query}` : "/app/assessments";
  };

  const groupValue = (name: string) => name.trim() || "__blank__";

  const openAssessments = (overrides: Record<string, string | undefined> = {}) => {
    navigate(assessmentsPath(overrides));
  };

  const onRowKey = (
    event: KeyboardEvent,
    overrides: Record<string, string | undefined>,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openAssessments(overrides);
    }
  };

  const businessUnits = useMemo(
    () => Array.from(new Set(employees.map((e) => e.businessUnit))).sort(),
    [employees],
  );
  const functions = useMemo(
    () => Array.from(new Set(employees.map((e) => e.functionName))).sort(),
    [employees],
  );
  const statuses = useMemo(() => {
    const set = new Set<WorkflowStatus>();
    assessments.forEach((a) => set.add(a.status));
    return Array.from(set);
  }, [assessments]);

  const filtered = useMemo(
    () =>
      assessments.filter((a) => {
        const emp = employeeById(a.employeeId);
        if (!emp) return false;
        if (bu !== ALL && emp.businessUnit !== bu) return false;
        if (fn !== ALL && emp.functionName !== fn) return false;
        if (status !== ALL && a.status !== status) return false;
        if (rag !== ALL && derivedRag(a) !== rag) return false;
        return true;
      }),
    [assessments, employeeById, bu, fn, status, rag],
  );

  const metrics = useMemo(
    () => computeMetrics(filtered, employeeById),
    [filtered, employeeById],
  );

  const buPaging = usePagination(metrics.businessUnitRows, {
    resetKey: `${bu}|${fn}|${status}|${rag}`,
  });
  const fnPaging = usePagination(metrics.functionRows, {
    resetKey: `${bu}|${fn}|${status}|${rag}`,
  });

  const slaData = useMemo(
    () => [
      {
        name: "On track",
        key: "ON_TRACK" as const,
        value: filtered.filter((a) => effectiveSla(a) === "ON_TRACK").length,
      },
      {
        name: "Due soon",
        key: "DUE_SOON" as const,
        value: filtered.filter((a) => effectiveSla(a) === "DUE_SOON").length,
      },
      {
        name: "Breached",
        key: "BREACHED" as const,
        value: filtered.filter((a) => effectiveSla(a) === "BREACHED").length,
      },
      {
        name: "Completed",
        key: "COMPLETED" as const,
        value: filtered.filter((a) => effectiveSla(a) === "COMPLETED").length,
      },
    ],
    [filtered],
  );

  const selectClass =
    "h-10 w-full cursor-pointer rounded-md border border-background-300 bg-background-50 px-3 font-label text-sm text-foreground-800 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 sm:w-auto";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="HR Admin"
        title="Role clarity analytics"
        description="Organisation-wide analysis of role clarity, perception gaps, RAG distribution and SLA adherence."
        actions={
          <span className="inline-flex items-center gap-2 rounded-md border border-background-200 bg-background-100 px-3 py-2 font-label text-xs text-foreground-600">
            <i className="ri-database-2-line text-base" />
            {filtered.length} assessments in view
          </span>
        }
      />

      <SectionCard bodyClassName="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          <select value={bu} onChange={(e) => setBu(e.target.value)} className={selectClass}>
            <option value={ALL}>All business units</option>
            {businessUnits.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select value={fn} onChange={(e) => setFn(e.target.value)} className={selectClass}>
            <option value={ALL}>All functions</option>
            {functions.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={selectClass}
          >
            <option value={ALL}>All stages</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {WORKFLOW_STATUS_META[s].label}
              </option>
            ))}
          </select>
          <select value={rag} onChange={(e) => setRag(e.target.value)} className={selectClass}>
            <option value={ALL}>All RAG</option>
            <option value="GREEN">Green</option>
            <option value="AMBER">Amber</option>
            <option value="RED">Red</option>
          </select>
          {(bu !== ALL || fn !== ALL || status !== ALL || rag !== ALL) && (
            <button
              type="button"
              onClick={() => {
                setBu(ALL);
                setFn(ALL);
                setStatus(ALL);
                setRag(ALL);
              }}
              className="inline-flex h-10 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md px-3 font-label text-sm text-foreground-600 hover:bg-background-100"
            >
              <i className="ri-refresh-line text-base" />
              Reset filters
            </button>
          )}
        </div>
      </SectionCard>

      {filtered.length === 0 ? (
        <EmptyState
          icon="ri-filter-off-line"
          title="No data for the selected filters"
          description="Try widening the filters to see the organisation-wide analysis."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-4">
            <StatCard
              label="Total assessments"
              value={metrics.total}
              hint={`${metrics.open} open · ${metrics.completed} completed`}
              icon="ri-file-list-3-line"
              tone="progress"
              to={assessmentsPath()}
            />
            <StatCard
              label="Aligned vs not aligned"
              value={`${metrics.aligned} / ${metrics.notAligned}`}
              icon="ri-scales-3-line"
              tone="accent"
              to={assessmentsPath({ alignment: "ALIGNED" })}
            />
            <StatCard
              label="SLA breached"
              value={metrics.breached}
              hint={`${metrics.dueSoon} due soon · ${metrics.onTrack} on track`}
              icon="ri-error-warning-line"
              tone="danger"
              to={assessmentsPath({ sla: "BREACHED" })}
            />
            <StatCard
              label="Alignment conversations"
              value={filtered.filter((a) => a.alignmentConversation !== null).length}
              icon="ri-chat-1-line"
              tone="warning"
              to={assessmentsPath({ conversation: "1" })}
            />
            <StatCard
              label="Average employee score"
              value={scoreLabel(metrics.avgEmployee)}
              hint="Out of 5.00"
              icon="ri-user-star-line"
            />
            <StatCard
              label="Average manager score"
              value={scoreLabel(metrics.avgManager)}
              hint="Out of 5.00"
              icon="ri-user-voice-line"
            />
            <StatCard
              label="Average overall gap"
              value={
                metrics.avgGap === null
                  ? "—"
                  : `${metrics.avgGap > 0 ? "+" : ""}${metrics.avgGap}`
              }
              hint="Manager − Employee"
              icon="ri-bar-chart-grouped-line"
              tone="accent"
            />
            <StatCard
              label="Green cases"
              value={`${metrics.rag.GREEN} / ${metrics.total}`}
              hint="Target RAG profile"
              icon="ri-shield-star-line"
              tone="success"
              to={assessmentsPath({ rag: "GREEN" })}
            />
          </div>

          <SectionCard
            title="SLA adherence"
            description="Campaign SLA position across open cases. Click a row to open those assessments."
            icon="ri-timer-line"
            bodyClassName="p-0"
          >
            <div className="divide-y divide-background-100">
              {slaData.map((item) => {
                const pct = filtered.length
                  ? Math.round((item.value / filtered.length) * 100)
                  : 0;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => openAssessments({ sla: item.key })}
                    className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left hover:bg-primary-50/70"
                  >
                    <span className="font-label text-sm text-foreground-700">
                      {item.name}
                    </span>
                    <span className="font-label text-sm font-semibold text-foreground-900">
                      {item.value} · {pct}%
                    </span>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard
            title="Business unit analysis"
            description="Cases assessed, average gap and RAG mix by business unit. Click a row to open those assessments."
            icon="ri-building-4-line"
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto scrollbar-slim">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="border-b border-background-200">
                    {[
                      "Business unit",
                      "Assessed",
                      "Completed",
                      "Avg gap",
                      "Green",
                      "Amber",
                      "Red",
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
                  {buPaging.pageItems.map((row) => (
                    <tr
                      key={row.name}
                      role="link"
                      tabIndex={0}
                      onClick={() =>
                        openAssessments({ businessUnit: groupValue(row.name) })
                      }
                      onKeyDown={(event) =>
                        onRowKey(event, { businessUnit: groupValue(row.name) })
                      }
                      className="cursor-pointer border-b border-background-100 transition-colors hover:bg-primary-50/70"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-foreground-800">
                        {row.name}
                      </td>
                      <td className="px-4 py-3 font-label text-sm text-foreground-700">
                        {row.total}
                      </td>
                      <td
                        className="px-4 py-3 font-label text-sm text-foreground-700"
                        onClick={(event) => {
                          event.stopPropagation();
                          openAssessments({
                            businessUnit: groupValue(row.name),
                            status: "COMPLETED",
                          });
                        }}
                      >
                        {row.completed}
                      </td>
                      <td className="px-4 py-3 font-label text-sm text-foreground-700">
                        {scoreLabel(row.avgGap)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="cursor-pointer"
                          onClick={(event) => {
                            event.stopPropagation();
                            openAssessments({
                              businessUnit: groupValue(row.name),
                              rag: "GREEN",
                            });
                          }}
                        >
                          <Badge tone="success">{row.green}</Badge>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="cursor-pointer"
                          onClick={(event) => {
                            event.stopPropagation();
                            openAssessments({
                              businessUnit: groupValue(row.name),
                              rag: "AMBER",
                            });
                          }}
                        >
                          <Badge tone="warning">{row.amber}</Badge>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="cursor-pointer"
                          onClick={(event) => {
                            event.stopPropagation();
                            openAssessments({
                              businessUnit: groupValue(row.name),
                              rag: "RED",
                            });
                          }}
                        >
                          <Badge tone="danger">{row.red}</Badge>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={buPaging.page}
              pageSize={buPaging.pageSize}
              totalItems={buPaging.totalItems}
              totalPages={buPaging.totalPages}
              from={buPaging.from}
              to={buPaging.to}
              onPageChange={buPaging.setPage}
              onPageSizeChange={buPaging.setPageSize}
              itemLabel="business units"
            />
          </SectionCard>

          <SectionCard
            title="Function analysis"
            description="Shared services and functional breakdown. Click a row to open those assessments."
            icon="ri-organization-chart"
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto scrollbar-slim">
              <table className="w-full min-w-[620px] text-left">
                <thead>
                  <tr className="border-b border-background-200">
                    {["Function", "Assessed", "Avg gap", "RAG mix"].map((h) => (
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
                  {fnPaging.pageItems.map((row) => (
                    <tr
                      key={row.name}
                      role="link"
                      tabIndex={0}
                      onClick={() =>
                        openAssessments({ function: groupValue(row.name) })
                      }
                      onKeyDown={(event) =>
                        onRowKey(event, { function: groupValue(row.name) })
                      }
                      className="cursor-pointer border-b border-background-100 transition-colors hover:bg-primary-50/70"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-foreground-800">
                        {row.name}
                      </td>
                      <td className="px-4 py-3 font-label text-sm text-foreground-700">
                        {row.total}
                      </td>
                      <td className="px-4 py-3 font-label text-sm text-foreground-700">
                        {scoreLabel(row.avgGap)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            className="cursor-pointer"
                            onClick={(event) => {
                              event.stopPropagation();
                              openAssessments({
                                function: groupValue(row.name),
                                rag: "GREEN",
                              });
                            }}
                          >
                            <Badge tone="success">{row.green}</Badge>
                          </button>
                          <button
                            type="button"
                            className="cursor-pointer"
                            onClick={(event) => {
                              event.stopPropagation();
                              openAssessments({
                                function: groupValue(row.name),
                                rag: "AMBER",
                              });
                            }}
                          >
                            <Badge tone="warning">{row.amber}</Badge>
                          </button>
                          <button
                            type="button"
                            className="cursor-pointer"
                            onClick={(event) => {
                              event.stopPropagation();
                              openAssessments({
                                function: groupValue(row.name),
                                rag: "RED",
                              });
                            }}
                          >
                            <Badge tone="danger">{row.red}</Badge>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={fnPaging.page}
              pageSize={fnPaging.pageSize}
              totalItems={fnPaging.totalItems}
              totalPages={fnPaging.totalPages}
              from={fnPaging.from}
              to={fnPaging.to}
              onPageChange={fnPaging.setPage}
              onPageSizeChange={fnPaging.setPageSize}
              itemLabel="functions"
            />
          </SectionCard>
        </>
      )}
    </div>
  );
}