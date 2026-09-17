import { useMemo } from "react";
import AssessmentExplorer from "@/components/feature/AssessmentExplorer";
import StatCard from "@/components/base/StatCard";
import { useApp } from "@/store/AppContext";

export default function SignoffsPage() {
  const { myAssessments } = useApp();

  const stats = useMemo(() => {
    const pending = myAssessments.filter(
      (a) => a.status === "HOD_SIGNOFF_PENDING",
    ).length;
    const completed = myAssessments.filter(
      (a) => a.status === "COMPLETED",
    ).length;
    const conversations = myAssessments.filter(
      (a) => a.status === "ROLE_ALIGNMENT_IN_PROGRESS",
    ).length;
    return { pending, completed, conversations };
  }, [myAssessments]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        <StatCard
          label="Awaiting final sign-off"
          value={stats.pending}
          icon="ri-verified-badge-line"
          tone="warning"
        />
        <StatCard
          label="Closed cases"
          value={stats.completed}
          icon="ri-archive-line"
          tone="success"
        />
        <StatCard
          label="In alignment conversation"
          value={stats.conversations}
          icon="ri-chat-1-line"
          tone="accent"
        />
      </div>

      <AssessmentExplorer
        assessments={myAssessments}
        eyebrow="HOD"
        title="Final sign-off queue"
        description="The HOD sign-off is the terminal stage. Review the gap profile, manager comments and any alignment conversation before signing off."
        showAlignment
        emptyTitle="No cases awaiting sign-off"
        emptyDescription="Cases that reach the HOD sign-off stage will appear here."
      />
    </div>
  );
}