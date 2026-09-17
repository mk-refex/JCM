import { useMemo } from "react";
import { Link } from "react-router-dom";
import StatCard from "@/components/base/StatCard";
import { SectionCard } from "@/components/base/Card";
import ScoreBar from "@/components/feature/ScoreBar";
import { Badge } from "@/components/base/Badge";
import AssessmentTable from "@/components/feature/AssessmentTable";
import { useApp } from "@/store/AppContext";
import { computeMetrics, scoreLabel } from "@/lib/metrics";

export default function AdminDashboard() {
  const { assessments, employees, employeeById, users } = useApp();

  const metrics = useMemo(
    () => computeMetrics(assessments, employeeById),
    [assessments, employeeById],
  );

  const ragTotal = metrics.rag.GREEN + metrics.rag.AMBER + metrics.rag.RED;
  const ragPct = (value: number) =>
    ragTotal ? Math.round((value / ragTotal) * 100) : 0;

  const dueSoonList = assessments
    .filter((a) => a.status !== "COMPLETED")
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-background-200 bg-background-50 p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-label text-xs font-semibold uppercase tracking-widest text-primary-600">
              HR Admin · Organisation overview
            </p>
            <h2 className="mt-1 font-heading text-xl font-semibold text-foreground-950 md:text-2xl">
              Job Clarity exercise at a glance
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-foreground-600">
              {employees.length} employees across {metrics.businessUnitRows.length}{" "}
              business units · {users.length} system users · {assessments.length}{" "}
              assessments in flight.
            </p>
          </div>
          <Link
            to="/app/analytics"
            className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-md bg-primary-500 px-4 py-2.5 font-label text-sm font-medium text-white hover:bg-primary-600"
          >
            <i className="ri-bar-chart-box-line text-base" />
            Open analytics
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3 2xl:grid-cols-5">
        <StatCard
          label="Total assessments"
          value={metrics.total}
          icon="ri-file-list-3-line"
          tone="progress"
        />
        <StatCard
          label="Open"
          value={metrics.open}
          icon="ri-time-line"
          tone="warning"
        />
        <StatCard
          label="Completed"
          value={metrics.completed}
          icon="ri-checkbox-circle-line"
          tone="success"
        />
        <StatCard
          label="Aligned"
          value={metrics.aligned}
          icon="ri-thumb-up-line"
          tone="success"
        />
        <StatCard
          label="Not aligned"
          value={metrics.notAligned}
          icon="ri-emotion-unhappy-line"
          tone="danger"
        />
        <StatCard
          label="SLA breached"
          value={metrics.breached}
          icon="ri-error-warning-line"
          tone="danger"
        />
        <StatCard
          label="Alignment conversations"
          value={
            assessments.filter((a) => a.alignmentConversation !== null).length
          }
          icon="ri-chat-1-line"
          tone="accent"
        />
        <StatCard
          label="Avg employee score"
          value={scoreLabel(metrics.avgEmployee)}
          hint="Out of 5.00"
          icon="ri-user-star-line"
          tone="neutral"
        />
        <StatCard
          label="Avg manager score"
          value={scoreLabel(metrics.avgManager)}
          hint="Out of 5.00"
          icon="ri-user-voice-line"
          tone="neutral"
        />
        <StatCard
          label="Avg overall gap"
          value={metrics.avgGap === null ? "—" : `${metrics.avgGap > 0 ? "+" : ""}${metrics.avgGap}`}
          hint="Manager − Employee"
          icon="ri-scales-3-line"
          tone="accent"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard
          title="RAG distribution"
          description="Based on the assessor average and the absolute gap."
          icon="ri-pie-chart-line"
        >
          <div className="flex flex-col gap-4">
            {(
              [
                { key: "GREEN", label: "Green", tone: "success" as const },
                { key: "AMBER", label: "Amber", tone: "warning" as const },
                { key: "RED", label: "Red", tone: "danger" as const },
              ] as const
            ).map((item) => {
              const count = metrics.rag[item.key];
              return (
                <div key={item.key}>
                  <div className="flex items-center justify-between">
                    <Badge tone={item.tone} dot>
                      {item.label}
                    </Badge>
                    <span className="font-label text-sm font-semibold text-foreground-900">
                      {count} · {ragPct(count)}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-background-200">
                    <div
                      className={
                        item.key === "GREEN"
                          ? "h-full rounded-full bg-primary-500"
                          : item.key === "AMBER"
                            ? "h-full rounded-full bg-accent-500"
                            : "h-full rounded-full bg-accent-900"
                      }
                      style={{ width: `${ragPct(count)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {metrics.ragUnknown > 0 && (
              <p className="border-t border-background-200 pt-3 text-xs text-foreground-500">
                {metrics.ragUnknown} case(s) not yet RAG-rated (manager assessment
                pending).
              </p>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Employee vs Manager"
          description="Average score across all completed comparisons."
          icon="ri-bar-chart-grouped-line"
        >
          <div className="flex flex-col gap-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-label text-xs text-foreground-600">
                  Employee self rating
                </span>
                <span className="font-label text-sm font-semibold text-foreground-900">
                  {scoreLabel(metrics.avgEmployee)}
                </span>
              </div>
              <div className="mt-1.5">
                <ScoreBar value={metrics.avgEmployee} tone="secondary" showValue={false} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="font-label text-xs text-foreground-600">
                  Manager rating
                </span>
                <span className="font-label text-sm font-semibold text-foreground-900">
                  {scoreLabel(metrics.avgManager)}
                </span>
              </div>
              <div className="mt-1.5">
                <ScoreBar value={metrics.avgManager} tone="primary" showValue={false} />
              </div>
            </div>
            <div className="rounded-md bg-secondary-50 p-3 text-xs text-foreground-700">
              An overall gap of{" "}
              <strong className="font-semibold">
                {metrics.avgGap === null ? "—" : metrics.avgGap}
              </strong>{" "}
              means the manager rates clarity {metrics.avgGap !== null && metrics.avgGap < 0 ? "lower" : "higher"} than employees do on average.
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Dimension watchlist"
          description="Dimensions with the largest perception gap."
          icon="ri-eye-line"
        >
          <ul className="flex flex-col gap-3.5">
            {[...metrics.dimensionTrend]
              .sort((a, b) => Math.abs(b.gap ?? 0) - Math.abs(a.gap ?? 0))
              .slice(0, 5)
              .map((row) => (
                <li key={row.key}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground-700">
                      {row.shortName}
                    </span>
                    <span className="font-label text-xs text-foreground-500">
                      {row.gap === null
                        ? "—"
                        : `${row.gap > 0 ? "+" : ""}${row.gap}`}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <ScoreBar
                      value={row.gap === null ? null : Math.abs(row.gap)}
                      max={3}
                      tone="accent"
                      showValue={false}
                    />
                  </div>
                </li>
              ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard
        title="Open cases"
        description="Active assessments across the organisation."
        icon="ri-list-check"
        bodyClassName="p-0"
      >
        <AssessmentTable
          assessments={dueSoonList}
          showAlignment
          emptyTitle="No open cases"
          emptyDescription="All assessments are complete."
        />
      </SectionCard>
    </div>
  );
}