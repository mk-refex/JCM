import { SectionCard } from "@/components/base/Card";
import { Badge } from "@/components/base/Badge";
import { formatDate } from "@/lib/utils";
import type { Assessment, Employee } from "@/types/domain";

interface CaseOverviewProps {
  assessment: Assessment;
  employee?: Employee;
  showResponses: boolean;
}

export default function CaseOverview({
  assessment,
  employee,
  showResponses,
}: CaseOverviewProps) {
  const totalPercent = assessment.responsibilities.reduce(
    (sum, r) => sum + (r.percent ?? 0),
    0,
  );

  const details = [
    { label: "Employee ID", value: employee?.empId },
    { label: "Business Unit", value: employee?.businessUnit },
    { label: "Function / Department", value: employee?.functionName },
    { label: "Designation / Role Title", value: employee?.designation },
    { label: "Grade / Band", value: employee?.grade },
    { label: "Location", value: employee?.location },
    { label: "Date of Joining", value: formatDate(employee?.dateOfJoining) },
    { label: "Company", value: employee?.company },
  ];

  return (
    <div className="flex flex-col gap-6">
      <SectionCard
        title="Section A — Employee details"
        description="Pre-filled from the employee master record."
        icon="ri-id-card-line"
      >
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          {details.map((item) => (
            <div key={item.label}>
              <dt className="font-label text-[11px] uppercase tracking-wide text-foreground-500">
                {item.label}
              </dt>
              <dd className="mt-1 text-sm font-medium text-foreground-900">
                {item.value ?? "—"}
              </dd>
            </div>
          ))}
        </dl>
      </SectionCard>

      <SectionCard
        title="Initial Role Clarity Check"
        description="Do you have clarity on your current role and expectations?"
        icon="ri-question-answer-line"
      >
        {assessment.initialClarityResponse ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                tone={
                  assessment.initialClarityResponse === "YES"
                    ? "success"
                    : assessment.initialClarityResponse === "PARTIALLY"
                      ? "warning"
                      : "danger"
                }
                dot
              >
                {assessment.initialClarityResponse === "YES"
                  ? "Yes"
                  : assessment.initialClarityResponse === "PARTIALLY"
                    ? "Partially"
                    : "No"}
              </Badge>
              <span className="text-xs text-foreground-500">
                Answered {formatDate(assessment.initialClarityAt)}
              </span>
            </div>
            <p className="text-sm text-foreground-700">
              {assessment.initialClarityResponse === "YES"
                ? "The employee confirmed full clarity. The review was closed at the initial check."
                : "The employee did not confirm full clarity, so the detailed self assessment across the 7 dimensions was opened."}
            </p>
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-background-300 bg-background-100/60 p-4 text-sm text-foreground-500">
            The initial role clarity check has not been answered yet.
          </p>
        )}
      </SectionCard>

      <SectionCard
        title="Section B — Key job responsibilities"
        description="Owned tasks and outcomes with the approximate share of time."
        icon="ri-list-check-2"
        bodyClassName="p-0"
      >
        {!showResponses ? (
          <div className="p-5">
            <div className="flex items-start gap-3 rounded-md border border-accent-200 bg-accent-50 p-4">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                <i className="ri-lock-line text-base text-accent-700" />
              </span>
              <p className="text-sm text-foreground-700">
                Employee responses are hidden until the independent manager
                assessment is submitted. This protects the integrity of the gap
                measure.
              </p>
            </div>
          </div>
        ) : assessment.responsibilities.length ? (
          <div className="overflow-x-auto scrollbar-slim">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="border-b border-background-200">
                  <th className="w-12 px-4 py-3 font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                    #
                  </th>
                  <th className="px-4 py-3 font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                    Key job responsibility
                  </th>
                  <th className="w-32 px-4 py-3 font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                    % allocation
                  </th>
                </tr>
              </thead>
              <tbody>
                {assessment.responsibilities.map((r, index) => (
                  <tr key={r.id} className="border-b border-background-100">
                    <td className="px-4 py-3 font-label text-sm text-foreground-500">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground-800">
                      {r.text}
                    </td>
                    <td className="px-4 py-3 font-label text-sm font-semibold text-foreground-900">
                      {r.percent === null ? "—" : `${r.percent}%`}
                    </td>
                  </tr>
                ))}
                <tr className="bg-background-100">
                  <td />
                  <td className="px-4 py-3 font-label text-sm font-semibold text-foreground-900">
                    Total
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        totalPercent === 100
                          ? "font-label text-sm font-semibold text-primary-700"
                          : "font-label text-sm font-semibold text-accent-700"
                      }
                    >
                      {totalPercent}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5">
            <p className="rounded-md border border-dashed border-background-300 bg-background-100/60 p-4 text-sm text-foreground-500">
              No responsibilities have been entered yet.
            </p>
          </div>
        )}
      </SectionCard>
    </div>
  );
}