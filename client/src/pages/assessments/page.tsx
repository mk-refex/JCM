import AssessmentExplorer from "@/components/feature/AssessmentExplorer";
import { useApp } from "@/store/AppContext";

export default function AssessmentsList() {
  const { myAssessments, currentUser } = useApp();

  const isAdmin = currentUser?.role === "ADMIN";

  return (
    <AssessmentExplorer
      assessments={myAssessments}
      eyebrow={isAdmin ? "HR Admin" : "Employee"}
      title={isAdmin ? "All role clarity assessments" : "My role clarity reviews"}
      description={
        isAdmin
          ? "Every role clarity review in the organisation, including drafts, open cases and closed records."
          : "Reviews assigned to you. Open a case to continue where you left off."
      }
      showAlignment
      emptyTitle="Nothing here yet"
      emptyDescription="Role clarity reviews will appear here once they are created."
    />
  );
}