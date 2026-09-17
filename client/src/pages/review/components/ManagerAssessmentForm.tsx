import { useMemo, useState } from "react";
import Button from "@/components/base/Button";
import { SectionCard } from "@/components/base/Card";
import EmployeeDetailsSection from "@/pages/review/components/EmployeeDetailsSection";
import RatingDimensions from "@/pages/review/components/RatingDimensions";
import ManagerReviewSubmitModal from "@/pages/review/components/ManagerReviewSubmitModal";
import { CLARITY_DIMENSIONS } from "@/constants/clarity";
import { cn } from "@/lib/utils";
import type { ManagerAssessmentInput } from "@/services/workflowService";
import type { Assessment, Employee } from "@/types/domain";

interface ManagerAssessmentFormProps {
  assessment: Assessment;
  employee?: Employee;
  managerName?: string;
  onSaveDraft: (input: ManagerAssessmentInput) => void;
  onSubmit: (input: ManagerAssessmentInput) => void;
}

function buildInitialRatings(assessment: Assessment) {
  const map: Record<string, number | null> = {};
  CLARITY_DIMENSIONS.forEach((dimension) => {
    map[dimension.key] = null;
  });
  assessment.managerRatings.forEach((rating) => {
    map[rating.dimensionKey] = rating.score;
  });
  return map;
}

export default function ManagerAssessmentForm({
  assessment,
  employee,
  managerName,
  onSaveDraft,
  onSubmit,
}: ManagerAssessmentFormProps) {
  const [ratings, setRatings] = useState<Record<string, number | null>>(() =>
    buildInitialRatings(assessment),
  );
  const [roleExpectations, setRoleExpectations] = useState(
    assessment.roleExpectations,
  );
  const [comments, setComments] = useState(assessment.managerComments);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [savedLabel, setSavedLabel] = useState<string | null>(null);

  const employeeName = employee?.name ?? "your team member";

  const setRating = (dimensionKey: string, score: number) => {
    setRatings((prev) => ({ ...prev, [dimensionKey]: score }));
  };

  const ratedCount = useMemo(
    () =>
      CLARITY_DIMENSIONS.filter(
        (d) => typeof ratings[d.key] === "number",
      ).length,
    [ratings],
  );

  const checks = [
    {
      key: "ratings",
      label: `All 7 dimensions rated (${ratedCount}/7)`,
      ok: ratedCount === CLARITY_DIMENSIONS.length,
    },
    {
      key: "expectations",
      label: "Role expectations / clarifications recorded",
      ok: roleExpectations.trim().length > 0,
    },
  ];
  const canSubmit = checks.every((c) => c.ok);

  const buildInput = (): ManagerAssessmentInput => ({
    managerRatings: CLARITY_DIMENSIONS.map((dimension) => ({
      dimensionKey: dimension.key,
      score: ratings[dimension.key] ?? null,
    })),
    managerComments: comments.trim(),
    roleExpectations: roleExpectations.trim(),
  });

  const handleConfirmSubmit = () => {
    setReviewOpen(false);
    onSubmit(buildInput());
  };

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-lg border border-secondary-200 bg-secondary-50 px-3 py-2">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary-100 text-secondary-800">
              <i className="ri-user-voice-line text-sm" />
            </span>
            <div>
              <p className="font-label text-sm font-semibold text-foreground-900">
                Independent manager assessment in progress
              </p>
              <p className="mt-0.5 text-xs text-foreground-600">
                Rate {employeeName} across the 7 clarity dimensions and record
                the role expectations. Employee ratings stay hidden until you
                submit.
                {savedLabel ? ` Last saved at ${savedLabel}.` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              icon="ri-save-line"
              onClick={() => {
                onSaveDraft(buildInput());
                setSavedLabel(
                  new Date().toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                );
              }}
            >
              Save draft
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon="ri-send-plane-line"
              disabled={!canSubmit}
              onClick={() => setReviewOpen(true)}
            >
              Review &amp; submit
            </Button>
          </div>
        </div>
      </section>

      <EmployeeDetailsSection employee={employee} managerName={managerName} />

      <RatingDimensions
        value={ratings}
        onChange={setRating}
        sectionTitle="Section B — Manager independent rating"
        sectionDescription={`Rate ${employeeName}'s role clarity on each of the 7 dimensions using the dropdown. Rate independently — the employee's own ratings are not shown to you until after you submit.`}
        ratingLabel="Your rating"
      />

      <SectionCard
        title="Section C — Role expectations / clarifications"
        description="After your rating, capture the role expectations and clarifications that the employee will review. This is shared with the employee during the alignment check."
        icon="ri-clipboard-line"
      >
        <label className="mb-1.5 block font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
          Role expectations / clarifications
        </label>
        <textarea
          value={roleExpectations}
          onChange={(e) => setRoleExpectations(e.target.value.slice(0, 1500))}
          rows={6}
          maxLength={1500}
          placeholder="e.g. The role is expected to own end-to-end vendor negotiation for spends up to the approved threshold, with escalations above that. Decision rights on routine approvals rest with the role holder…"
          className="w-full resize-y rounded-lg border border-background-300 bg-white px-4 py-3 font-label text-sm leading-relaxed text-foreground-900 placeholder:text-foreground-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-colors"
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-foreground-500">
            <i className="ri-information-line mr-1" />
            Required — this is what the employee will see and respond to.
          </p>
          <span
            className={cn(
              "font-label text-[11px] font-medium",
              roleExpectations.length > 1350
                ? "text-accent-700"
                : "text-foreground-400",
            )}
          >
            {roleExpectations.length}/1500
          </span>
        </div>
      </SectionCard>

      <SectionCard
        title="Section D — Manager comments / coaching notes"
        description="Optional notes for the record. These accompany the expectations and are visible to the employee and HR."
        icon="ri-chat-quote-line"
      >
        <label className="mb-1.5 block font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
          Comments / coaching notes
        </label>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value.slice(0, 1000))}
          rows={5}
          maxLength={1000}
          placeholder="e.g. Strong ownership on delivery; would benefit from clearer delegation of the monthly reporting cycle to the team…"
          className="w-full resize-y rounded-lg border border-background-300 bg-white px-4 py-3 font-label text-sm leading-relaxed text-foreground-900 placeholder:text-foreground-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-colors"
        />
        <div className="mt-2 flex items-center justify-end">
          <span
            className={cn(
              "font-label text-[11px] font-medium",
              comments.length > 900 ? "text-accent-700" : "text-foreground-400",
            )}
          >
            {comments.length}/1000
          </span>
        </div>
      </SectionCard>

      <SectionCard
        title="Submission readiness"
        description="All checks must pass before the manager assessment can be submitted."
        icon="ri-shield-check-line"
      >
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {checks.map((check) => (
            <li
              key={check.key}
              className={cn(
                "flex items-start gap-2.5 rounded-md border p-3",
                check.ok
                  ? "border-primary-200 bg-primary-50"
                  : "border-background-200 bg-background-100",
              )}
            >
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                <i
                  className={cn(
                    "text-base",
                    check.ok
                      ? "ri-checkbox-circle-fill text-primary-600"
                      : "ri-error-warning-line text-foreground-400",
                  )}
                />
              </span>
              <span className="text-xs leading-relaxed text-foreground-700">
                {check.label}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-background-200 pt-4">
          <p className="text-xs text-foreground-500">
            {canSubmit
              ? "Everything looks good. You can submit your assessment."
              : "Resolve the outstanding checks above to enable submission."}
          </p>
          <Button
            variant="primary"
            icon="ri-send-plane-line"
            disabled={!canSubmit}
            onClick={() => setReviewOpen(true)}
          >
            Review &amp; submit
          </Button>
        </div>
      </SectionCard>

      <ManagerReviewSubmitModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onConfirm={handleConfirmSubmit}
        employee={employee}
        input={buildInput()}
      />
    </div>
  );
}