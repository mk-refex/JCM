import { useMemo } from "react";
import AssessmentExplorer from "@/components/feature/AssessmentExplorer";
import StatCard from "@/components/base/StatCard";
import { useApp } from "@/store/AppContext";
import { effectiveAgeing } from "@/lib/metrics";

export default function CasesPage() {
  const { myAssessments } = useApp();

  const stats = useMemo(() => {
    const notAligned = myAssessments.filter(
      (a) => a.alignmentStatus === "NOT_ALIGNED",
    ).length;
    const open = myAssessments.filter((a) => a.status !== "COMPLETED").length;
    const ages = myAssessments
      .filter((a) => a.status !== "COMPLETED")
      .map(effectiveAgeing);
    const avgAgeing = ages.length
      ? Math.round(ages.reduce((x, y) => x + y, 0) / ages.length)
      : 0;
    return { notAligned, open, avgAgeing };
  }, [myAssessments]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        <StatCard
          label="Active cases"
          value={stats.open}
          icon="ri-briefcase-line"
          tone="progress"
        />
        <StatCard
          label="Not aligned cases"
          value={stats.notAligned}
          icon="ri-emotion-unhappy-line"
          tone="danger"
        />
        <StatCard
          label="Average ageing"
          value={`${stats.avgAgeing} d`}
          hint="Working days, open cases"
          icon="ri-hourglass-line"
          tone="warning"
        />
      </div>

      <AssessmentExplorer
        assessments={myAssessments}
        eyebrow="HRBP"
        title="Case console"
        description="Follow progress, identify intervention cases and record observations during alignment conversations."
        showAlignment
        emptyTitle="No cases in your scope"
        emptyDescription="Cases mapped to you as HRBP will appear here."
      />
    </div>
  );
}