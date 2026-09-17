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
  scoreLabel,
} from "@/pages/assessments/detail/components/helpers";
import { gapDescription } from "@/pages/assessments/detail/components/helpers";
import { managerHasSubmitted } from "@/services/assessmentService";
import type { Assessment } from "@/types/domain";

export default function ScoreComparison({
  assessment,
}: {
  assessment: Assessment;
}) {
  const managerSubmitted = managerHasSubmitted(assessment);
  const rows = buildDimensionGaps(
    assessment.employeeRatings,
    assessment.managerRatings,
  );
  const empAvg = derivedEmployeeAverage(assessment);
  const mgrAvg = derivedManagerAverage(assessment);
  const gap = derivedGap(assessment);
  const rag = derivedRag(assessment);

  return (
    <SectionCard
      title="Section C — Role clarity rating"
      description="Seven dimensions rated independently by the employee and the reporting manager."
      icon="ri-star-half-line"
      bodyClassName="p-0"
    >
      {!managerSubmitted ? (
        <div className="p-5">
          <div className="flex items-start gap-3 rounded-md border border-secondary-200 bg-secondary-50 p-4">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              <i className="ri-hourglass-line text-base text-secondary-700" />
            </span>
            <div>
              <p className="font-label text-sm font-semibold text-foreground-900">
                Comparison not available yet
              </p>
              <p className="mt-1 text-sm text-foreground-700">
                The gap, averages and RAG are shown only after the reporting
                manager submits their independent assessment.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2 p-3 md:hidden">
            {CLARITY_DIMENSIONS.map((dim) => {
              const row = rows.find((r) => r.dimensionKey === dim.key)!;
              return (
                <div
                  key={dim.key}
                  className="rounded-lg border border-background-200 bg-background-50 p-3"
                >
                  <p className="text-sm font-semibold text-foreground-900">
                    {dim.order}. {dim.name}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-foreground-500">
                    {dim.definition}
                  </p>
                  <div className="mt-2.5 grid grid-cols-3 gap-2">
                    <div>
                      <p className="font-label text-[10px] uppercase tracking-wide text-foreground-500">
                        Employee
                      </p>
                      <div className="mt-1">
                        <ScoreChip score={row.employeeScore} size="sm" />
                      </div>
                    </div>
                    <div>
                      <p className="font-label text-[10px] uppercase tracking-wide text-foreground-500">
                        Manager
                      </p>
                      <div className="mt-1">
                        <ScoreChip score={row.managerScore} size="sm" />
                      </div>
                    </div>
                    <div>
                      <p className="font-label text-[10px] uppercase tracking-wide text-foreground-500">
                        Gap
                      </p>
                      <div className="mt-1">
                        <GapChip gap={row.gap} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto scrollbar-slim md:block">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-background-200">
                  <th className="px-4 py-3 font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                    Clarity dimension
                  </th>
                  <th className="px-4 py-3 font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                    Employee
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
                {CLARITY_DIMENSIONS.map((dim) => {
                  const row = rows.find((r) => r.dimensionKey === dim.key)!;
                  return (
                    <tr
                      key={dim.key}
                      className="border-b border-background-100 align-top"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-foreground-900">
                          {dim.order}. {dim.name}
                        </p>
                        <p className="mt-0.5 text-xs text-foreground-500">
                          {dim.definition}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <ScoreChip score={row.employeeScore} />
                      </td>
                      <td className="px-4 py-3">
                        <ScoreChip score={row.managerScore} />
                      </td>
                      <td className="px-4 py-3">
                        <GapChip gap={row.gap} />
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
                Employee average
              </p>
              <p className="mt-1 font-heading text-lg font-semibold text-foreground-950">
                {scoreLabel(empAvg)}
              </p>
            </div>
            <div>
              <p className="font-label text-[11px] uppercase tracking-wide text-foreground-500">
                Manager average
              </p>
              <p className="mt-1 font-heading text-lg font-semibold text-foreground-950">
                {scoreLabel(mgrAvg)}
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

          <p className="border-t border-background-200 px-3 py-2.5 text-xs text-foreground-600 md:px-5 md:py-3">
            {gapDescription(gap)}
          </p>
        </>
      )}
    </SectionCard>
  );
}