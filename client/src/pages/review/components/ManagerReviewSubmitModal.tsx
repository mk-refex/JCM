import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import { CLARITY_DIMENSIONS, RATING_SCALE } from "@/constants/clarity";
import { formatDate } from "@/lib/utils";
import type { ManagerAssessmentInput } from "@/services/workflowService";
import type { Employee } from "@/types/domain";

interface ManagerReviewSubmitModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  employee?: Employee;
  input: ManagerAssessmentInput;
}

export default function ManagerReviewSubmitModal({
  open,
  onClose,
  onConfirm,
  employee,
  input,
}: ManagerReviewSubmitModalProps) {
  const ratedCount = input.managerRatings.filter(
    (r) => typeof r.score === "number",
  ).length;

  const details = [
    { label: "Employee ID", value: employee?.empId },
    { label: "Employee Name", value: employee?.name },
    { label: "Designation", value: employee?.designation },
    { label: "Business Unit", value: employee?.businessUnit },
    { label: "Department", value: employee?.functionName },
    { label: "Date of Joining", value: formatDate(employee?.dateOfJoining) },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Review your manager assessment"
      description="Check everything below before you submit. Once submitted, your assessment is locked and the employee is asked to confirm alignment."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Keep editing
          </Button>
          <Button variant="primary" icon="ri-send-plane-line" onClick={onConfirm}>
            Submit assessment
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="rounded-md border border-accent-200 bg-accent-50 p-3.5">
          <p className="text-xs leading-relaxed text-foreground-800">
            <strong className="font-semibold">Please confirm.</strong> After
            submission you will not be able to edit this assessment. The employee
            will then review your expectations and confirm whether they are
            aligned.
          </p>
        </div>

        <section>
          <p className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
            Employee
          </p>
          <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            {details.map((item) => (
              <div
                key={item.label}
                className="rounded-md bg-background-100 px-3 py-2"
              >
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
              Independent clarity rating
            </p>
            <span className="font-label text-xs font-semibold text-foreground-600">
              {ratedCount}/{CLARITY_DIMENSIONS.length} rated
            </span>
          </div>
          <div className="mt-2 flex flex-col divide-y divide-background-100 rounded-md border border-background-200">
            {CLARITY_DIMENSIONS.map((dimension) => {
              const rating = input.managerRatings.find(
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
            Role expectations / clarifications
          </p>
          <p className="mt-2 rounded-md border border-background-200 bg-background-50 px-3 py-2.5 text-sm text-foreground-800">
            {input.roleExpectations || "No expectations recorded."}
          </p>
        </section>

        <section>
          <p className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
            Manager comments / coaching notes
          </p>
          <p className="mt-2 rounded-md border border-background-200 bg-background-50 px-3 py-2.5 text-sm text-foreground-800">
            {input.managerComments || "No comments provided."}
          </p>
        </section>
      </div>
    </Modal>
  );
}