import type { Assessment, User } from "@/types/domain";

const SUBMITTED_MANAGER_STATUSES: Assessment["status"][] = [
  "MANAGER_ASSESSMENT_COMPLETED",
  "EMPLOYEE_ALIGNMENT_PENDING",
  "ALIGNED",
  "ROLE_ALIGNMENT_REQUIRED",
  "ROLE_ALIGNMENT_IN_PROGRESS",
  "ROLE_ALIGNMENT_COMPLETED",
  "HOD_SIGNOFF_PENDING",
  "COMPLETED",
];

/** A manager assessment counts as submitted once it is persisted. */
export function managerHasSubmitted(assessment: Assessment): boolean {
  return SUBMITTED_MANAGER_STATUSES.includes(assessment.status);
}

/** True when the given user is the employee that the review is about. */
export function isSubjectOf(
  user: User | null,
  assessment: Assessment,
): boolean {
  if (!user?.employeeId) return false;
  return assessment.employeeId === user.employeeId;
}

/** True when the given user is the reporting manager on the record. */
export function isManagerActorOf(
  user: User | null,
  assessment: Assessment,
): boolean {
  if (!user?.employeeId) return false;
  return assessment.managerId === user.employeeId;
}

/** True when the given user is the HOD on the record. */
export function isHodActorOf(
  user: User | null,
  assessment: Assessment,
): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (!user.employeeId) return false;
  return assessment.hodId === user.employeeId;
}

/** True when the given user is the HRBP on the record (or an admin). */
export function isHrbpActorOf(
  user: User | null,
  assessment: Assessment,
): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (!user.employeeId) return false;
  return assessment.hrbpId === user.employeeId;
}

export function isConversationStage(status: Assessment["status"]): boolean {
  return (
    status === "ROLE_ALIGNMENT_REQUIRED" ||
    status === "ROLE_ALIGNMENT_IN_PROGRESS"
  );
}

/**
 * Server-side style authorization check for a single record.
 * Access is decided by the person's relationship to the case, so a Manager, HOD
 * or HRBP who is ALSO an employee can open their own review in the same way a
 * regular employee does.
 */
export function canAccessAssessment(
  user: User | null,
  assessment: Assessment,
): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  const id = user.employeeId;
  if (!id) return false;
  return (
    assessment.employeeId === id ||
    assessment.managerId === id ||
    assessment.hodId === id ||
    assessment.hrbpId === id
  );
}

export function canViewEmployeeResponses(
  user: User | null,
  assessment: Assessment,
): boolean {
  if (!user) return false;
  // The subject of the review always sees their own answers.
  if (isSubjectOf(user, assessment)) return true;
  // The reporting manager must rate independently, blind to the employee answers.
  if (isManagerActorOf(user, assessment)) {
    return managerHasSubmitted(assessment);
  }
  return canAccessAssessment(user, assessment);
}

/**
 * Returns a copy of the assessment with employee responses removed when the
 * viewer is the reporting manager who has not yet submitted. This mirrors the
 * backend-level isolation rule and is applied before any data reaches the UI.
 */
export function applyResponseIsolation(
  user: User | null,
  assessment: Assessment,
): Assessment {
  if (canViewEmployeeResponses(user, assessment)) return assessment;
  return {
    ...assessment,
    employeeRatings: [],
    employeeComments: "",
    responsibilities: [],
    employeeOverallAverage: null,
    overallGap: null,
    ragStatus: null,
  };
}

export function visibleAssessmentsFor(
  user: User | null,
  assessments: Assessment[],
): Assessment[] {
  if (!user) return [];
  return assessments.filter((a) => canAccessAssessment(user, a));
}

/** Reviews that are about the given user — their own role clarity review. */
export function ownReviewsFor(
  user: User | null,
  assessments: Assessment[],
): Assessment[] {
  if (!user?.employeeId) return [];
  return assessments.filter((a) => a.employeeId === user.employeeId);
}

/** Everything except the user's own review — the cases they act on for others. */
export function excludeOwnReviews(
  user: User | null,
  assessments: Assessment[],
): Assessment[] {
  if (!user?.employeeId) return assessments;
  return assessments.filter((a) => a.employeeId !== user.employeeId);
}

/** Assessments where the given user still has an action to take. */
export function actionSectionsFor(
  user: User | null,
  assessments: Assessment[],
): Assessment[] {
  if (!user) return [];
  const id = user.employeeId;
  return assessments.filter((a) => {
    if (!canAccessAssessment(user, a)) return false;
    if (id) {
      // As the employee: the initial check, self assessment or alignment check.
      if (a.employeeId === id) {
        return (
          a.status === "DRAFT" ||
          a.status === "INITIAL_CLARITY_CHECK" ||
          a.status === "SELF_ASSESSMENT_PENDING" ||
          a.status === "MANAGER_ASSESSMENT_COMPLETED" ||
          a.status === "EMPLOYEE_ALIGNMENT_PENDING"
        );
      }
      // As the reporting manager: the independent assessment.
      if (a.managerId === id) {
        return a.status === "MANAGER_ASSESSMENT_PENDING";
      }
      // As the HOD: conversation comments and the terminal sign-off.
      if (a.hodId === id) {
        return (
          a.status === "HOD_SIGNOFF_PENDING" ||
          a.status === "ROLE_ALIGNMENT_REQUIRED" ||
          a.status === "ROLE_ALIGNMENT_IN_PROGRESS" ||
          a.status === "ROLE_ALIGNMENT_COMPLETED"
        );
      }
      // As the HRBP: observations during the role alignment conversation.
      if (a.hrbpId === id) {
        return (
          a.status === "ROLE_ALIGNMENT_REQUIRED" ||
          a.status === "ROLE_ALIGNMENT_IN_PROGRESS"
        );
      }
    }
    if (user.role === "ADMIN") return a.status !== "COMPLETED";
    return false;
  });
}