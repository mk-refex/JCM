import { useMemo } from "react";
import StatCard from "@/components/base/StatCard";
import { SectionCard } from "@/components/base/Card";
import AssessmentTable from "@/components/feature/AssessmentTable";
import ScoreBar from "@/components/feature/ScoreBar";
import { Badge } from "@/components/base/Badge";
import MyReviewCard from "@/pages/dashboard/components/MyReviewCard";
import { useApp } from "@/store/AppContext";
import { excludeOwnReviews, ownReviewsFor } from "@/services/assessmentService";
import { computeMetrics, effectiveSla, scoreLabel } from "@/lib/metrics";

export default function HodDashboard() {
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

  const pending = scoped.filter((a) => a.status === "HOD_SIGNOFF_PENDING");
  const completed = scoped.filter((a) => a.status === "COMPLETED");
  const alignmentCases = scoped.filter(
    (a) =>
      a.alignmentStatus === "NOT_ALIGNED" ||
      a.status === "ROLE_ALIGNMENT_REQUIRED" ||
      a.status === "ROLE_ALIGNMENT_IN_PROGRESS" ||
      a.status === "ROLE_ALIGNMENT_COMPLETED",
  );
  const breached = scoped.filter(
    (a) => effectiveSla(a) === "BREACHED",
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-background-200 bg-background-50 p-5 md:p-6">
        <p className="font-label text-xs font-semibold uppercase tracking-widest text-primary-600">
          HOD workspace
        </p>
        <h2 className="mt-1 font-heading text-xl font-semibold text-foreground-950 md:text-2xl">
          {currentUser?.name}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-foreground-600">
          The HOD final sign-off is the terminal stage of the workflow. Once
          signed off, the case is closed and can never loop back.
        </p>
      </section>

      <MyReviewCard reviews={own} />

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-4">
        <StatCard
          label="Pending sign-offs"
          value={pending.length}
          icon="ri-verified-badge-line"
          tone="warning"
        />
        <StatCard
          label="Completed sign-offs"
          value={completed.length}
          icon="ri-checkbox-circle-line"
          tone="success"
        />
        <StatCard
          label="Alignment cases"
          value={alignmentCases.length}
          icon="ri-chat-1-line"
          tone="accent"
        />
        <StatCard
          label="SLA breached"
          value={breached}
          icon="ri-error-warning-line"
          tone="danger"
        />
      </div>

      <SectionCard
        title="Awaiting your final sign-off"
        description="Review the full gap profile before signing off."
        icon="ri-file-check-line"
        bodyClassName="p-0"
        accent
      >
        <AssessmentTable
          assessments={pending}
          showAlignment
          emptyTitle="No pending sign-offs"
          emptyDescription="Cases ready for final sign-off will appear here."
        />
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard
          title="Organisation clarity profile"
          description="Averages across every case assigned to you."
          icon="ri-bar-chart-grouped-line"
        >
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-label text-xs text-foreground-600">
                  Employee average
                </span>
                <span className="font-label text-sm font-semibold text-foreground-900">
                  {scoreLabel(metrics.avgEmployee)} / 5
                </span>
              </div>
              <div className="mt-1.5">
                <ScoreBar value={metrics.avgEmployee} tone="secondary" showValue={false} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="font-label text-xs text-foreground-600">
                  Manager average
                </span>
                <span className="font-label text-sm font-semibold text-foreground-900">
                  {scoreLabel(metrics.avgManager)} / 5
                </span>
              </div>
              <div className="mt-1.5">
                <ScoreBar value={metrics.avgManager} tone="primary" showValue={false} />
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-background-200 pt-4">
              <Badge tone="success" dot>
                Green {metrics.rag.GREEN}
              </Badge>
              <Badge tone="warning" dot>
                Amber {metrics.rag.AMBER}
              </Badge>
              <Badge tone="danger" dot>
                Red {metrics.rag.RED}
              </Badge>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Dimension-wise clarity"
          description="Employee vs manager perception by dimension."
          icon="ri-list-check-2"
        >
          <ul className="flex flex-col gap-3.5">
            {metrics.dimensionTrend.map((row) => (
              <li key={row.key}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground-700">
                    {row.shortName}
                  </span>
                  <span className="font-label text-xs text-foreground-500">
                    E {scoreLabel(row.employee)} · M {scoreLabel(row.manager)}
                  </span>
                </div>
                <div className="mt-1.5">
                  <ScoreBar value={row.manager} tone="primary" showValue={false} />
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard
        title="Completed sign-offs"
        description="Formally closed role clarity reviews."
        icon="ri-archive-line"
        bodyClassName="p-0"
      >
        <AssessmentTable
          assessments={completed}
          showAlignment
          emptyTitle="No completed sign-offs yet"
          emptyDescription="Closed reviews will appear here."
        />
      </SectionCard>
    </div>
  );
}