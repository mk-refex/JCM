import { Link } from "react-router-dom";
import Avatar from "@/components/base/Avatar";
import {
  AlignmentBadge,
  RagBadge,
  SlaBadge,
  StatusBadge,
} from "@/components/base/Badge";
import ProgressStepper from "@/components/base/ProgressStepper";
import {
  derivedRag,
  effectiveSla,
  progressLabel,
} from "@/pages/assessments/detail/components/helpers";
import { WORKFLOW_STATUS_META } from "@/constants/clarity";
import { formatDate } from "@/lib/utils";
import type { Assessment, Employee } from "@/types/domain";
import { useApp } from "@/store/AppContext";

interface CaseHeaderProps {
  assessment: Assessment;
  employee?: Employee;
}

export default function CaseHeader({ assessment, employee }: CaseHeaderProps) {
  const { employeeById } = useApp();
  const manager = employeeById(assessment.managerId);
  const hod = employeeById(assessment.hodId);
  const hrbp = employeeById(assessment.hrbpId);

  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/app/assessments"
        className="inline-flex w-fit cursor-pointer items-center gap-1.5 font-label text-sm text-foreground-600 hover:text-primary-700"
      >
        <i className="ri-arrow-left-line text-base" />
        Back to assessments
      </Link>

      <section className="rounded-lg border border-background-200 bg-background-50 p-4 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <Avatar name={employee?.name ?? "Unknown"} size="lg" />
            <div className="min-w-0">
              <h2 className="font-heading text-lg font-semibold text-foreground-950 md:text-xl">
                {employee?.name ?? "Unknown employee"}
              </h2>
              <p className="mt-0.5 text-sm text-foreground-600">
                {employee?.designation} · {employee?.businessUnit}
              </p>
              <p className="mt-0.5 text-xs text-foreground-500">
                {employee?.empId} · {assessment.code}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge status={assessment.status} />
                <SlaBadge status={effectiveSla(assessment)} />
                <RagBadge rag={derivedRag(assessment)} />
                <AlignmentBadge status={assessment.alignmentStatus} />
              </div>
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:w-[420px]">
            {[
              { label: "Completion", value: `${progressLabel(assessment.status)}%` },
              { label: "SLA due", value: formatDate(assessment.sla.dueAt) },
              { label: "Owner now", value: WORKFLOW_STATUS_META[assessment.status].stageOwner },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-md border border-background-200 bg-background-100 p-3"
              >
                <p className="font-label text-[11px] uppercase tracking-wide text-foreground-500">
                  {item.label}
                </p>
                <p className="mt-1 font-heading text-sm font-semibold text-foreground-950">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-background-200 bg-background-100 p-3 md:mt-6 md:p-4">
          <ProgressStepper
            compact
            status={assessment.status}
            conversationRequired={
              assessment.alignmentConversation !== null ||
              assessment.alignmentStatus === "NOT_ALIGNED" ||
              assessment.status === "ALIGNED"
            }
            closedAtInitialCheck={
              assessment.status === "COMPLETED" &&
              assessment.initialClarityResponse === "YES"
            }
          />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-background-200 pt-5 sm:grid-cols-3">
          {[
            { label: "Reporting Manager", value: manager?.name ?? "—" },
            { label: "HOD", value: hod?.name ?? "—" },
            { label: "HR Business Partner", value: hrbp?.name ?? "—" },
          ].map((item) => (
            <div key={item.label}>
              <p className="font-label text-[11px] uppercase tracking-wide text-foreground-500">
                {item.label}
              </p>
              <p className="mt-1 text-sm font-medium text-foreground-900">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}