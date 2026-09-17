import { useMemo, useState } from "react";
import Button from "@/components/base/Button";
import { SectionCard } from "@/components/base/Card";
import EmployeeDetailsSection from "@/pages/review/components/EmployeeDetailsSection";
import ResponsibilitiesEditor from "@/pages/review/components/ResponsibilitiesEditor";
import RatingDimensions from "@/pages/review/components/RatingDimensions";
import ReviewSubmitModal from "@/pages/review/components/ReviewSubmitModal";
import { CLARITY_DIMENSIONS } from "@/constants/clarity";
import { cn, uid } from "@/lib/utils";
import type { SelfAssessmentInput } from "@/services/workflowService";
import type { Assessment, Employee, Responsibility } from "@/types/domain";

interface SelfAssessmentFormProps {
  assessment: Assessment;
  employee?: Employee;
  managerName?: string;
  onSaveDraft: (input: SelfAssessmentInput) => void;
  onSubmit: (input: SelfAssessmentInput) => void;
}

function buildInitialRatings(assessment: Assessment) {
  const map: Record<string, number | null> = {};
  CLARITY_DIMENSIONS.forEach((dimension) => {
    map[dimension.key] = null;
  });
  assessment.employeeRatings.forEach((rating) => {
    map[rating.dimensionKey] = rating.score;
  });
  return map;
}

export default function SelfAssessmentForm({
  assessment,
  employee,
  managerName,
  onSaveDraft,
  onSubmit,
}: SelfAssessmentFormProps) {
  const [responsibilities, setResponsibilities] = useState<Responsibility[]>(
    () =>
      assessment.responsibilities.length
        ? assessment.responsibilities
        : [{ id: uid("resp"), text: "", percent: null }],
  );
  const [ratings, setRatings] = useState<Record<string, number | null>>(() =>
    buildInitialRatings(assessment),
  );
  const [comments, setComments] = useState(assessment.employeeComments);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [savedLabel, setSavedLabel] = useState<string | null>(null);

  const setRating = (dimensionKey: string, score: number) => {
    setRatings((prev) => ({ ...prev, [dimensionKey]: score }));
  };

  const validResponsibilities = useMemo(
    () => responsibilities.filter((r) => r.text.trim().length > 0),
    [responsibilities],
  );

  const totalPercent = validResponsibilities.reduce(
    (sum, r) => sum + (r.percent ?? 0),
    0,
  );
  const ratedCount = CLARITY_DIMENSIONS.filter(
    (d) => typeof ratings[d.key] === "number",
  ).length;

  const checks = [
    {
      key: "responsibilities",
      label: "At least one responsibility entered",
      ok: validResponsibilities.length > 0,
    },
    {
      key: "percent",
      label: "Time allocation totals exactly 100%",
      ok: validResponsibilities.length > 0 && totalPercent === 100,
    },
    {
      key: "ratings",
      label: `All 7 dimensions rated (${ratedCount}/7)`,
      ok: ratedCount === CLARITY_DIMENSIONS.length,
    },
  ];
  const canSubmit = checks.every((c) => c.ok);

  const buildInput = (): SelfAssessmentInput => ({
    responsibilities: validResponsibilities.map((r, index) => ({
      id: r.id || `r${index + 1}`,
      text: r.text.trim(),
      percent: r.percent,
    })),
    employeeRatings: CLARITY_DIMENSIONS.map((dimension) => ({
      dimensionKey: dimension.key,
      score: ratings[dimension.key] ?? null,
    })),
    employeeComments: comments.trim(),
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
              <i className="ri-draft-line text-sm" />
            </span>
            <div>
              <p className="font-label text-sm font-semibold text-foreground-900">
                Self Assessment in progress
              </p>
              <p className="text-xs text-foreground-600">
                Complete Sections A–D. Save as draft at any time; submit when all
                checks pass.
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

      <ResponsibilitiesEditor
        rows={responsibilities}
        onChange={setResponsibilities}
      />

      <RatingDimensions value={ratings} onChange={setRating} />

      <SectionCard
        title="Section D — Employee comments"
        description="Please note any specific aspect of your role you would like your manager or HR to clarify further."
        icon="ri-chat-3-line"
        compact
      >
        <label className="mb-1.5 block font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
          Your comments / clarification request
        </label>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value.slice(0, 1000))}
          rows={4}
          maxLength={1000}
          placeholder="e.g. I am unclear about the scope of my decision-making authority regarding vendor approvals, and would like my manager to clarify the escalation threshold…"
          className="w-full resize-y rounded-lg border border-background-300 bg-white px-4 py-3 font-label text-sm leading-relaxed text-foreground-900 placeholder:text-foreground-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-colors"
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-foreground-500">
            <i className="ri-information-line mr-1" />
            Optional — but strongly recommended if you are rating any dimension below 4.
          </p>
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
        description="All checks must pass before the self assessment can be submitted."
        icon="ri-shield-check-line"
        compact
      >
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-background-200 pt-3">
          <p className="text-xs text-foreground-500">
            {canSubmit
              ? "Everything looks good. You can submit your self assessment."
              : "Resolve the outstanding checks above to enable submission."}
          </p>
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
      </SectionCard>

      <ReviewSubmitModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onConfirm={handleConfirmSubmit}
        employee={employee}
        managerName={managerName}
        input={buildInput()}
      />
    </div>
  );
}