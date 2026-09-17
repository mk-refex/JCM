import { Link } from "react-router-dom";
import Button from "@/components/base/Button";
import StatCard from "@/components/base/StatCard";
import { SectionCard } from "@/components/base/Card";
import { RagBadge, SlaBadge, StatusBadge, AlignmentBadge } from "@/components/base/Badge";
import ProgressStepper from "@/components/base/ProgressStepper";
import AssessmentTable from "@/components/feature/AssessmentTable";
import EmptyState from "@/components/base/EmptyState";
import { useApp } from "@/store/AppContext";
import {
  derivedEmployeeAverage,
  derivedGap,
  derivedManagerAverage,
  derivedRag,
  effectiveSla,
} from "@/lib/metrics";
import { progressPercent } from "@/lib/workflow";
import { formatDate } from "@/lib/utils";
import { WORKFLOW_STATUS_META } from "@/constants/clarity";

export default function EmployeeDashboard() {
  const { myAssessments, employeeById, currentUser } = useApp();
  const employee = employeeById(currentUser?.employeeId);
  const active =
    myAssessments.find((a) => a.status !== "COMPLETED") ?? myAssessments[0];
  const completedCount = myAssessments.filter(
    (a) => a.status === "COMPLETED",
  ).length;

  if (!myAssessments.length) {
    return (
      <EmptyState
        icon="ri-file-list-3-line"
        title="No role clarity review assigned yet"
        description="Once your HR Business Partner opens a Role Clarity Review for your role, it will appear here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-lg border border-background-200 bg-background-50 px-3 py-2.5 md:px-4 md:py-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-primary-600">
              Welcome back
            </p>
            <h2 className="font-heading text-base font-semibold text-foreground-950 sm:text-lg">
              {currentUser?.name}
            </h2>
            <p className="mt-0.5 text-xs text-foreground-600">
              {employee?.designation} · {employee?.businessUnit}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {active && <StatusBadge status={active.status} />}
              {active && <SlaBadge status={effectiveSla(active)} />}
              {active && <RagBadge rag={derivedRag(active)} />}
              {active && <AlignmentBadge status={active.alignmentStatus} />}
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-1.5 sm:flex-row sm:items-center">
            <div className="flex items-center justify-between rounded-md border border-background-200 bg-background-50 px-2.5 py-1.5 sm:block sm:px-3 sm:py-1.5">
              <p className="font-label text-[11px] uppercase tracking-wide text-foreground-500">
                Completion
              </p>
              <p className="font-heading text-base font-semibold text-foreground-950 sm:text-lg">
                {active ? progressPercent(active.status) : 0}%
              </p>
            </div>
            {active && (
              <Link to={`/app/review/${active.id}`} className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="sm"
                  icon="ri-arrow-right-circle-line"
                  className="w-full sm:w-auto"
                >
                  Continue review
                </Button>
              </Link>
            )}
          </div>
        </div>

        {active && (
          <div className="mt-2 rounded-md border border-background-200 bg-background-50 px-2 py-1.5 md:px-3 md:py-2">
            <ProgressStepper
              status={active.status}
              compact
              conversationRequired={!!active.alignmentConversation || active.alignmentStatus === "NOT_ALIGNED"}
              closedAtInitialCheck={
                active.status === "COMPLETED" &&
                active.initialClarityResponse === "YES"
              }
            />
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-4">
        <StatCard
          label="Assigned reviews"
          value={myAssessments.length}
          icon="ri-file-list-3-line"
          tone="progress"
        />
        <StatCard
          label="Open"
          value={myAssessments.length - completedCount}
          icon="ri-time-line"
          tone="warning"
        />
        <StatCard
          label="Completed"
          value={completedCount}
          icon="ri-checkbox-circle-line"
          tone="success"
        />
        <StatCard
          label="My average rating"
          value={
            active && derivedEmployeeAverage(active) !== null
              ? derivedEmployeeAverage(active)!.toFixed(2)
              : "—"
          }
          hint="Across the 7 clarity dimensions"
          icon="ri-star-line"
          tone="accent"
        />
      </div>

      {active && (
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
          <SectionCard
            title="Current stage"
            description={WORKFLOW_STATUS_META[active.status].description}
            icon="ri-flag-line"
            className="lg:col-span-2"
            compact
          >
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
              <div className="flex items-center justify-between rounded-md border border-background-200 bg-background-100 px-2.5 py-2 sm:block">
                <p className="font-label text-[11px] uppercase tracking-wide text-foreground-500">
                  Stage owner
                </p>
                <p className="font-heading text-sm font-semibold text-foreground-950 sm:mt-0.5">
                  {WORKFLOW_STATUS_META[active.status].stageOwner}
                </p>
              </div>
              <div className="flex items-center justify-between rounded-md border border-background-200 bg-background-100 px-2.5 py-2 sm:block">
                <p className="font-label text-[11px] uppercase tracking-wide text-foreground-500">
                  SLA due
                </p>
                <p className="font-heading text-sm font-semibold text-foreground-950 sm:mt-0.5">
                  {formatDate(active.sla.dueAt)}
                </p>
              </div>
              <div className="flex items-center justify-between rounded-md border border-background-200 bg-background-100 px-2.5 py-2 sm:block">
                <p className="font-label text-[11px] uppercase tracking-wide text-foreground-500">
                  Reference
                </p>
                <p className="font-heading text-sm font-semibold text-foreground-950 sm:mt-0.5">
                  {active.code}
                </p>
              </div>
            </div>
            <div className="mt-2 rounded-md bg-secondary-50 px-2.5 py-2">
              <p className="font-label text-[11px] font-semibold uppercase tracking-wide text-secondary-700">
                What happens next
              </p>
              <p className="mt-0.5 text-xs text-foreground-700">
                {WORKFLOW_STATUS_META[active.status].description}
              </p>
            </div>
          </SectionCard>

          <SectionCard
            title="Manager expectations"
            description="Available after the manager submits."
            icon="ri-user-voice-line"
            accent
            compact
          >
            {derivedManagerAverage(active) === null ? (
              <p className="rounded-md border border-dashed border-background-300 bg-background-100/60 px-2.5 py-2 text-xs text-foreground-500">
                The manager assessment has not been submitted yet. Expectations
                and comments will appear here once received.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between rounded-md border border-background-200 bg-background-100 px-2.5 py-2">
                  <span className="font-label text-[11px] uppercase tracking-wide text-foreground-500">
                    Manager average
                  </span>
                  <span className="font-heading text-sm font-semibold text-foreground-950">
                    {derivedManagerAverage(active)?.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-background-200 bg-background-100 px-2.5 py-2">
                  <span className="font-label text-[11px] uppercase tracking-wide text-foreground-500">
                    Overall gap
                  </span>
                  <span className="font-heading text-sm font-semibold text-foreground-950">
                    {derivedGap(active) === null
                      ? "—"
                      : `${derivedGap(active)! > 0 ? "+" : ""}${derivedGap(active)}`}
                  </span>
                </div>
                {active.roleExpectations && (
                  <div className="px-0.5 pt-0.5">
                    <p className="font-label text-[11px] font-semibold uppercase tracking-wide text-foreground-500">
                      Role expectations
                    </p>
                    <p className="mt-0.5 text-xs text-foreground-700">
                      {active.roleExpectations}
                    </p>
                  </div>
                )}
                {active.managerComments && (
                  <div className="px-0.5">
                    <p className="font-label text-[11px] font-semibold uppercase tracking-wide text-foreground-500">
                      Manager comments
                    </p>
                    <p className="mt-0.5 text-xs text-foreground-700">
                      {active.managerComments}
                    </p>
                  </div>
                )}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      <SectionCard
        title="All my role clarity reviews"
        description="Every review assigned to you, with its live stage."
        icon="ri-history-line"
        bodyClassName="p-0"
      >
        <AssessmentTable
          assessments={myAssessments}
          emptyTitle="No reviews yet"
          emptyDescription="Your assigned role clarity reviews will appear here."
        />
      </SectionCard>
    </div>
  );
}