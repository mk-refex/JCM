import { useMemo } from "react";
import StatCard from "@/components/base/StatCard";
import { SectionCard } from "@/components/base/Card";
import AssessmentTable from "@/components/feature/AssessmentTable";
import ScoreBar from "@/components/feature/ScoreBar";
import { Badge } from "@/components/base/Badge";
import MyReviewCard from "@/pages/dashboard/components/MyReviewCard";
import { useApp } from "@/store/AppContext";
import { excludeOwnReviews, ownReviewsFor } from "@/services/assessmentService";
import { computeMetrics, effectiveAgeing, scoreLabel } from "@/lib/metrics";

export default function HrbpDashboard() {
  const { myAssessments, employeeById, currentUser } = useApp();

  const own = useMemo(
    () => ownReviewsFor(currentUser, myAssessments),
    [currentUser, myAssessments],
  );
  const scoped = useMemo(
    () => excludeOwnReviews(currentUser, myAssessments),
    [currentUser, myAssessments],
  );

  const metrics = useMemo(
    () => computeMetrics(scoped, employeeById),
    [scoped, employeeById],
  );

  const notAligned = scoped.filter(
    (a) => a.alignmentStatus === "NOT_ALIGNED",
  );
  const conversations = scoped.filter(
    (a) =>
      a.status === "ROLE_ALIGNMENT_REQUIRED" ||
      a.status === "ROLE_ALIGNMENT_IN_PROGRESS" ||
      a.status === "ROLE_ALIGNMENT_COMPLETED" ||
      a.alignmentConversation !== null,
  );
  const activeCases = scoped.filter((a) => a.status !== "COMPLETED");

  const avgAgeing = useMemo(() => {
    const ages = activeCases.map(effectiveAgeing);
    return ages.length
      ? Math.round(ages.reduce((x, y) => x + y, 0) / ages.length)
      : 0;
  }, [activeCases]);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-background-200 bg-background-50 p-5 md:p-6">
        <p className="font-label text-xs font-semibold uppercase tracking-widest text-primary-600">
          HR Business Partner console
        </p>
        <h2 className="mt-1 font-heading text-xl font-semibold text-foreground-950 md:text-2xl">
          {currentUser?.name}
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-foreground-600">
          HRBPs have visibility throughout the workflow without being an approval
          stage. Track progress, spot intervention cases, monitor SLA and support
          alignment conversations.
        </p>
      </section>

      <MyReviewCard reviews={own} />

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-4">
        <StatCard
          label="Active cases"
          value={activeCases.length}
          hint={`${metrics.total} total in scope`}
          icon="ri-briefcase-line"
          tone="progress"
        />
        <StatCard
          label="Not aligned"
          value={notAligned.length}
          icon="ri-emotion-unhappy-line"
          tone="danger"
        />
        <StatCard
          label="Alignment conversations"
          value={conversations.length}
          icon="ri-chat-1-line"
          tone="accent"
        />
        <StatCard
          label="Avg ageing"
          value={`${avgAgeing} d`}
          hint="Working days on open cases"
          icon="ri-hourglass-line"
          tone="warning"
        />
      </div>

      <SectionCard
        title="Cases requiring HRBP attention"
        description="Not-aligned cases and everything currently in a role alignment conversation."
        icon="ri-alert-line"
        bodyClassName="p-0"
        accent
      >
        <AssessmentTable
          assessments={conversations}
          showAlignment
          emptyTitle="No intervention cases"
          emptyDescription="When an employee indicates the expectations are not aligned, the case appears here."
        />
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard
          title="Role clarity gaps by dimension"
          description="Where the organisation-wide perception gap is widest."
          icon="ri-focus-3-line"
        >
          <ul className="flex flex-col gap-3.5">
            {metrics.dimensionTrend.map((row) => (
              <li key={row.key}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground-700">
                    {row.shortName}
                  </span>
                  <span className="font-label text-xs text-foreground-500">
                    gap {row.gap === null ? "—" : `${row.gap > 0 ? "+" : ""}${row.gap}`}
                  </span>
                </div>
                <div className="mt-1.5">
                  <ScoreBar value={row.gap === null ? null : Math.abs(row.gap)} max={3} tone="accent" showValue={false} />
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          title="Business unit trend"
          description="Employees assessed, average gap and RAG mix."
          icon="ri-building-2-line"
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto scrollbar-slim">
            <table className="w-full min-w-[520px] text-left">
              <thead>
                <tr className="border-b border-background-200">
                  <th className="px-4 py-3 font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                    Business unit
                  </th>
                  <th className="px-4 py-3 font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                    Cases
                  </th>
                  <th className="px-4 py-3 font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                    Avg gap
                  </th>
                  <th className="px-4 py-3 font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                    RAG mix
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.businessUnitRows.map((row) => (
                  <tr key={row.name} className="border-b border-background-100">
                    <td className="px-4 py-3 text-sm text-foreground-800">
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
                        <Badge tone="success">{row.green}</Badge>
                        <Badge tone="warning">{row.amber}</Badge>
                        <Badge tone="danger">{row.red}</Badge>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="All cases in my scope"
        description="Complete case list with alignment status."
        icon="ri-list-check"
        bodyClassName="p-0"
      >
        <AssessmentTable
          assessments={scoped}
          showAlignment
          emptyTitle="No cases assigned"
          emptyDescription="Cases mapped to you as HRBP will appear here."
        />
      </SectionCard>
    </div>
  );
}