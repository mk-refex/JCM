import { useMemo } from "react";
import StatCard from "@/components/base/StatCard";
import { SectionCard } from "@/components/base/Card";
import AssessmentTable from "@/components/feature/AssessmentTable";
import MyReviewCard from "@/pages/dashboard/components/MyReviewCard";
import { useApp } from "@/store/AppContext";
import { excludeOwnReviews, ownReviewsFor } from "@/services/assessmentService";
import { effectiveAgeing, effectiveSla } from "@/lib/metrics";

export default function ManagerDashboard() {
  const { myAssessments, employeeById, currentUser } = useApp();

  const own = useMemo(
    () => ownReviewsFor(currentUser, myAssessments),
    [currentUser, myAssessments],
  );
  const scoped = useMemo(
    () => excludeOwnReviews(currentUser, myAssessments),
    [currentUser, myAssessments],
  );

  const { pending, completed, breached, dueSoon, avgAgeing } = useMemo(() => {
    const p = scoped.filter((a) => a.status === "MANAGER_ASSESSMENT_PENDING");
    const c = scoped.filter(
      (a) => a.status !== "MANAGER_ASSESSMENT_PENDING" && a.status !== "DRAFT",
    );
    const slaValues = scoped.map(effectiveSla);
    const ages = scoped
      .filter((a) => a.status !== "COMPLETED")
      .map(effectiveAgeing);
    return {
      pending: p,
      completed: c,
      breached: slaValues.filter((s) => s === "BREACHED").length,
      dueSoon: slaValues.filter((s) => s === "DUE_SOON").length,
      avgAgeing: ages.length
        ? Math.round(ages.reduce((x, y) => x + y, 0) / ages.length)
        : 0,
    };
  }, [scoped]);

  const teamSize = new Set(scoped.map((a) => a.employeeId)).size;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-background-200 bg-background-50 p-5 md:p-6">
        <p className="font-label text-xs font-semibold uppercase tracking-widest text-primary-600">
          Reporting Manager workspace
        </p>
        <h2 className="mt-1 font-heading text-xl font-semibold text-foreground-950 md:text-2xl">
          {currentUser?.name}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-foreground-600">
          You are required to rate each of the 7 clarity dimensions
          independently. Employee ratings and comments stay hidden until your
          assessment is submitted — this protects the integrity of the gap
          measure.
        </p>
      </section>

      <MyReviewCard reviews={own} />

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-4">
        <StatCard
          label="Awaiting my assessment"
          value={pending.length}
          icon="ri-time-line"
          tone="warning"
        />
        <StatCard
          label="Assessments in progress"
          value={completed.length}
          hint={`${teamSize} team members`}
          icon="ri-team-line"
          tone="progress"
        />
        <StatCard
          label="SLA due soon"
          value={dueSoon}
          icon="ri-alarm-warning-line"
          tone="accent"
        />
        <StatCard
          label="SLA breached"
          value={breached}
          hint={`Avg ageing ${avgAgeing} working days`}
          icon="ri-error-warning-line"
          tone="danger"
        />
      </div>

      <SectionCard
        title="Awaiting your independent assessment"
        description="Rate these employees before the employee responses are revealed to you."
        icon="ri-user-follow-line"
        bodyClassName="p-0"
        accent
      >
        <AssessmentTable
          assessments={pending}
          emptyTitle="You're all caught up"
          emptyDescription="There are no assessments awaiting your rating right now."
        />
      </SectionCard>

      <SectionCard
        title="My team's assessments"
        description="Every assessment where you are the reporting manager."
        icon="ri-group-line"
        bodyClassName="p-0"
      >
        <AssessmentTable
          assessments={scoped}
          showAlignment
          emptyTitle="No assessments assigned"
          emptyDescription="Assessments will appear here once your team members submit their self assessment."
        />
      </SectionCard>
    </div>
  );
}