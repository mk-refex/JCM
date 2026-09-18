import { useState } from "react";
import Button from "@/components/base/Button";
import { SectionCard } from "@/components/base/Card";
import { RagBadge } from "@/components/base/Badge";
import ScoreChip, { GapChip } from "@/components/base/ScoreChip";
import { CLARITY_DIMENSIONS } from "@/constants/clarity";
import { buildDimensionGaps } from "@/lib/rag";
import {
  derivedEmployeeAverage,
  derivedGap,
  derivedManagerAverage,
  derivedRag,
} from "@/lib/metrics";
import { cn } from "@/lib/utils";
import type { AlignmentStatus, Assessment } from "@/types/domain";

interface AlignmentCheckProps {
  assessment: Assessment;
  onDecide: (
    decision: Exclude<AlignmentStatus, "PENDING">,
  ) => void | Promise<unknown>;
}

export default function AlignmentCheck({
  assessment,
  onDecide,
}: AlignmentCheckProps) {
  const [decision, setDecision] = useState<
    Exclude<AlignmentStatus, "PENDING"> | null
  >(null);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!decision || submitting) return;
    setSubmitting(true);
    try {
      await onDecide(decision);
    } finally {
      setSubmitting(false);
    }
  };

  const rows = buildDimensionGaps(
    assessment.employeeRatings,
    assessment.managerRatings,
  );
  const empAvg = derivedEmployeeAverage(assessment);
  const mgrAvg = derivedManagerAverage(assessment);
  const gap = derivedGap(assessment);
  const rag = derivedRag(assessment);

  return (
    <div className="flex flex-col gap-6">
      <SectionCard
        title="Manager assessment received"
        description="Your reporting manager has completed their independent assessment. Review the expectations and comparison below."
        icon="ri-user-voice-line"
        accent
      >
        <div className="flex flex-col gap-5">
          <div>
            <p className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
              Role expectations / clarifications
            </p>
            <p className="mt-1.5 text-sm text-foreground-800">
              {assessment.roleExpectations || "No role expectations recorded."}
            </p>
          </div>
          <div className="border-t border-background-200 pt-5">
            <p className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
              Manager comments / coaching notes
            </p>
            <p className="mt-1.5 text-sm text-foreground-800">
              {assessment.managerComments || "No comments provided."}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Employee vs manager comparison"
        description="Dimension-wise gap, overall averages and RAG. Gap = Manager rating − Employee rating."
        icon="ri-bar-chart-grouped-line"
        bodyClassName="p-0"
      >
        <div className="flex flex-col gap-2 p-3 md:hidden">
          {CLARITY_DIMENSIONS.map((dimension) => {
            const row = rows.find((r) => r.dimensionKey === dimension.key);
            return (
              <div
                key={dimension.key}
                className="rounded-lg border border-background-200 bg-background-50 p-3"
              >
                <p className="text-sm font-semibold text-foreground-900">
                  {dimension.order}. {dimension.name}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-foreground-500">
                  {dimension.definition}
                </p>
                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  <div>
                    <p className="font-label text-[10px] uppercase tracking-wide text-foreground-500">
                      You
                    </p>
                    <div className="mt-1">
                      <ScoreChip score={row?.employeeScore ?? null} size="sm" />
                    </div>
                  </div>
                  <div>
                    <p className="font-label text-[10px] uppercase tracking-wide text-foreground-500">
                      Manager
                    </p>
                    <div className="mt-1">
                      <ScoreChip score={row?.managerScore ?? null} size="sm" />
                    </div>
                  </div>
                  <div>
                    <p className="font-label text-[10px] uppercase tracking-wide text-foreground-500">
                      Gap
                    </p>
                    <div className="mt-1">
                      <GapChip gap={row?.gap ?? null} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden overflow-x-auto scrollbar-slim md:block">
          <table className="w-full min-w-[620px] text-left">
            <thead>
              <tr className="border-b border-background-200">
                <th className="px-4 py-3 font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                  Clarity dimension
                </th>
                <th className="px-4 py-3 font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                  You
                </th>
                <th className="px-4 py-3 font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                  Manager
                </th>
                <th className="px-4 py-3 font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                  Gap
                </th>
              </tr>
            </thead>
            <tbody>
              {CLARITY_DIMENSIONS.map((dimension) => {
                const row = rows.find(
                  (r) => r.dimensionKey === dimension.key,
                );
                return (
                  <tr
                    key={dimension.key}
                    className="border-b border-background-100"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-foreground-900">
                      {dimension.order}. {dimension.name}
                    </td>
                    <td className="px-4 py-3">
                      <ScoreChip score={row?.employeeScore ?? null} />
                    </td>
                    <td className="px-4 py-3">
                      <ScoreChip score={row?.managerScore ?? null} />
                    </td>
                    <td className="px-4 py-3">
                      <GapChip gap={row?.gap ?? null} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-background-200 bg-background-100 p-3 sm:grid-cols-2 md:grid-cols-4 md:gap-4 md:p-5">
          <div>
            <p className="font-label text-[11px] uppercase tracking-wide text-foreground-500">
              Your average
            </p>
            <p className="mt-1 font-heading text-lg font-semibold text-foreground-950">
              {empAvg === null ? "—" : empAvg.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="font-label text-[11px] uppercase tracking-wide text-foreground-500">
              Manager average
            </p>
            <p className="mt-1 font-heading text-lg font-semibold text-foreground-950">
              {mgrAvg === null ? "—" : mgrAvg.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="font-label text-[11px] uppercase tracking-wide text-foreground-500">
              Overall gap
            </p>
            <p className="mt-1 font-heading text-lg font-semibold text-foreground-950">
              {gap === null ? "—" : `${gap > 0 ? "+" : ""}${gap}`}
            </p>
          </div>
          <div>
            <p className="font-label text-[11px] uppercase tracking-wide text-foreground-500">
              RAG status
            </p>
            <div className="mt-1.5">
              <RagBadge rag={rag} />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Employee alignment check"
        description="Are the role expectations and clarifications provided aligned with your understanding of the role?"
        icon="ri-hand-heart-line"
      >
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setDecision("ALIGNED")}
              className={cn(
                "flex cursor-pointer flex-col gap-2 rounded-lg border p-4 text-left transition-colors",
                decision === "ALIGNED"
                  ? "border-primary-400 bg-primary-50 ring-2 ring-primary-100"
                  : "border-background-200 bg-background-50 hover:border-primary-300 hover:bg-background-100",
                submitting && "cursor-not-allowed opacity-70",
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-md",
                    decision === "ALIGNED"
                      ? "bg-primary-500 text-white dark:text-foreground-950"
                      : "bg-background-100 text-foreground-600",
                  )}
                >
                  <i className="ri-checkbox-circle-line text-lg" />
                </span>
                <span className="font-heading text-sm font-semibold text-foreground-950">
                  Aligned
                </span>
              </span>
              <span className="text-xs leading-relaxed text-foreground-600">
                The expectations match my understanding. Move the case to the HOD
                for final sign-off.
              </span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => setDecision("NOT_ALIGNED")}
              className={cn(
                "flex cursor-pointer flex-col gap-2 rounded-lg border p-4 text-left transition-colors",
                decision === "NOT_ALIGNED"
                  ? "border-accent-400 bg-accent-50 ring-2 ring-accent-100"
                  : "border-background-200 bg-background-50 hover:border-accent-300 hover:bg-background-100",
                submitting && "cursor-not-allowed opacity-70",
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-md",
                    decision === "NOT_ALIGNED"
                      ? "bg-accent-500 text-white"
                      : "bg-background-100 text-foreground-600",
                  )}
                >
                  <i className="ri-close-circle-line text-lg" />
                </span>
                <span className="font-heading text-sm font-semibold text-foreground-950">
                  Not aligned
                </span>
              </span>
              <span className="text-xs leading-relaxed text-foreground-600">
                Areas of difference remain. The Employee, Reporting Manager, HOD
                and HRBP will be notified, and the case will move into a Role
                Alignment Conversation — a constructive discussion, not an
                escalation.
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-background-200 pt-5">
            <p className="text-xs text-foreground-500">
              {decision
                ? "Confirm to record your decision."
                : "Your decision is mandatory to proceed."}
            </p>
            <Button
              variant="primary"
              icon="ri-check-double-line"
              loading={submitting}
              disabled={!decision || submitting}
              onClick={() => void handleConfirm()}
            >
              Confirm alignment decision
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}