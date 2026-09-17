import { useMemo } from "react";
import AssessmentExplorer from "@/components/feature/AssessmentExplorer";
import StatCard from "@/components/base/StatCard";
import { useApp } from "@/store/AppContext";

export default function TeamPage() {
  const { myAssessments } = useApp();

  const stats = useMemo(() => {
    const pending = myAssessments.filter(
      (a) => a.status === "MANAGER_ASSESSMENT_PENDING",
    ).length;
    const done = myAssessments.filter(
      (a) => a.status !== "MANAGER_ASSESSMENT_PENDING" && a.status !== "DRAFT",
    ).length;
    return { pending, done };
  }, [myAssessments]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        <StatCard
          label="Awaiting my assessment"
          value={stats.pending}
          icon="ri-time-line"
          tone="warning"
        />
        <StatCard
          label="Already assessed"
          value={stats.done}
          icon="ri-checkbox-circle-line"
          tone="success"
        />
        <StatCard
          label="Total team assessments"
          value={myAssessments.length}
          icon="ri-group-line"
          tone="progress"
        />
      </div>

      <AssessmentExplorer
        assessments={myAssessments}
        eyebrow="Reporting Manager"
        title="My team's role clarity assessments"
        description="You must rate each dimension independently. Employee responses remain hidden until you submit your assessment."
        showAlignment
        emptyTitle="No team assessments assigned"
        emptyDescription="Assessments will appear here once your team members submit their self assessment."
      />
    </div>
  );
}