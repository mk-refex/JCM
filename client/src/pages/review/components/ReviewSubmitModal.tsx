import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import { Badge } from "@/components/base/Badge";
import { CLARITY_DIMENSIONS, RATING_SCALE } from "@/constants/clarity";
import { formatDate } from "@/lib/utils";
import type { SelfAssessmentInput } from "@/services/workflowService";
import type { Employee } from "@/types/domain";

interface ReviewSubmitModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  employee?: Employee;
  managerName?: string;
  input: SelfAssessmentInput;
}

export default function ReviewSubmitModal({
  open,
  onClose,
  onConfirm,
  loading = false,
  employee,
  managerName,
  input,
}: ReviewSubmitModalProps) {
  const totalPercent = input.responsibilities.reduce(
    (sum, r) => sum + (r.percent ?? 0),
    0,
  );

  const details = [
    { label: "Employee ID", value: employee?.empId },
    { label: "Employee Name", value: employee?.name },
    { label: "Business Unit", value: employee?.businessUnit },
    { label: "Function / Department", value: employee?.functionName },
    { label: "Designation", value: employee?.designation },
    { label: "Grade / Band", value: employee?.grade },
    { label: "Reporting Manager", value: managerName },
    { label: "Location", value: employee?.location },
    { label: "Date of Joining", value: formatDate(employee?.dateOfJoining) },
    { label: "Company Name", value: employee?.company },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      preventClose={loading}
      size="lg"
      title="Review your self assessment"
      description="Check everything below before you submit. Once submitted, the assessment is locked and routed to your reporting manager."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Keep editing
          </Button>
          <Button
            variant="primary"
            icon="ri-send-plane-line"
            loading={loading}
            onClick={onConfirm}
          >
            Submit assessment
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="rounded-md border border-accent-200 bg-accent-50 p-3.5">
          <p className="text-xs leading-relaxed text-foreground-800">
            <strong className="font-semibold">Please confirm.</strong> After
            submission you will not be able to edit this assessment. Your
            reporting manager will complete an independent assessment before any
            comparison is shared with you.
          </p>
        </div>

        <section>
          <p className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
            Section A — Employee details
          </p>
          <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            {details.map((item) => (
              <div key={item.label} className="rounded-md bg-background-100 px-3 py-2">
                <dt className="text-[11px] uppercase tracking-wide text-foreground-500">
                  {item.label}
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-foreground-900">
                  {item.value ?? "—"}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <p className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
              Section B — Key job responsibilities
            </p>
            <Badge tone={totalPercent === 100 ? "success" : "warning"} dot>
              Total {totalPercent}%
            </Badge>
          </div>
          <ul className="mt-2 flex flex-col gap-2">
            {input.responsibilities.map((r, index) => (
              <li
                key={r.id}
                className="flex items-start justify-between gap-3 rounded-md border border-background-200 bg-background-50 px-3 py-2.5"
              >
                <span className="flex min-w-0 gap-2.5">
                  <span className="font-label text-xs font-semibold text-foreground-400">
                    {index + 1}.
                  </span>
                  <span className="text-sm text-foreground-800">{r.text}</span>
                </span>
                <span className="shrink-0 font-label text-sm font-semibold text-foreground-900">
                  {r.percent ?? 0}%
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <p className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
            Section C — Role clarity rating
          </p>
          <div className="mt-2 flex flex-col divide-y divide-background-100 rounded-md border border-background-200">
            {CLARITY_DIMENSIONS.map((dimension) => {
              const rating = input.employeeRatings.find(
                (r) => r.dimensionKey === dimension.key,
              );
              const label = RATING_SCALE.find(
                (r) => r.score === rating?.score,
              )?.label;
              return (
                <div
                  key={dimension.key}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <span className="text-sm text-foreground-800">
                    {dimension.order}. {dimension.name}
                  </span>
                  <span className="shrink-0 font-label text-sm font-semibold text-foreground-900">
                    {rating?.score ?? "—"}
                    {label ? ` · ${label}` : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <p className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
            Section D — Employee comments
          </p>
          <p className="mt-2 rounded-md border border-background-200 bg-background-50 px-3 py-2.5 text-sm text-foreground-800">
            {input.employeeComments || "No comments provided."}
          </p>
        </section>
      </div>
    </Modal>
  );
}