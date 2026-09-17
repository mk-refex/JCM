import { SectionCard } from "@/components/base/Card";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types/domain";

interface EmployeeDetailsSectionProps {
  employee?: Employee;
  managerName?: string;
}

interface FieldProps {
  label: string;
  value?: string;
  icon?: string;
  wide?: boolean;
}

function ReadonlyField({ label, value, icon, wide }: FieldProps) {
  return (
    <div className={cn(wide && "sm:col-span-2")}>
      <label className="mb-0.5 block font-label text-[11px] font-semibold uppercase tracking-wide text-foreground-500">
        {label}
      </label>
      <div
        className={cn(
          "flex min-h-[36px] items-center gap-2 rounded-md border border-background-200 bg-background-100 px-2.5 py-1.5",
        )}
      >
        {icon && (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center text-foreground-400">
            <i className={cn(icon, "text-sm")} />
          </span>
        )}
        <span
          className={cn(
            "font-label text-sm leading-snug",
            value ? "text-foreground-900 font-medium" : "italic text-foreground-400",
          )}
        >
          {value ?? "—"}
        </span>
        <span className="ml-auto flex h-4 w-4 shrink-0 items-center justify-center text-foreground-300">
          <i className="ri-lock-line text-xs" />
        </span>
      </div>
    </div>
  );
}

export default function EmployeeDetailsSection({
  employee,
  managerName,
}: EmployeeDetailsSectionProps) {
  return (
    <SectionCard
      title="Section A — Employee details"
      description="These fields are pre-filled from the employee master record and cannot be edited here."
      icon="ri-id-card-line"
      compact
      action={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-background-200 bg-background-100 px-2.5 py-1 font-label text-xs text-foreground-500">
          <i className="ri-lock-2-line text-xs" />
          Read-only
        </span>
      }
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <ReadonlyField
          label="Employee ID"
          value={employee?.empId}
          icon="ri-fingerprint-line"
        />
        <ReadonlyField
          label="Employee Name"
          value={employee?.name}
          icon="ri-user-line"
        />
        <ReadonlyField
          label="Company"
          value={employee?.company}
          icon="ri-building-line"
        />
        <ReadonlyField
          label="Business Unit"
          value={employee?.businessUnit}
          icon="ri-store-2-line"
        />
        <ReadonlyField
          label="Function / Department"
          value={employee?.functionName}
          icon="ri-organization-chart"
        />
        <ReadonlyField
          label="Designation / Role Title"
          value={employee?.designation}
          icon="ri-briefcase-line"
        />
        <ReadonlyField
          label="Grade / Band"
          value={employee?.grade}
          icon="ri-medal-line"
        />
        <ReadonlyField
          label="Reporting Manager"
          value={managerName}
          icon="ri-user-star-line"
        />
        <ReadonlyField
          label="Location"
          value={employee?.location}
          icon="ri-map-pin-line"
        />
        <ReadonlyField
          label="Date of Joining"
          value={formatDate(employee?.dateOfJoining)}
          icon="ri-calendar-line"
        />
      </div>

      <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-100 bg-amber-50 px-2.5 py-2">
        <i className="ri-information-line mt-0.5 shrink-0 text-sm text-amber-600" />
        <p className="text-xs leading-relaxed text-amber-800">
          If any of the details above are incorrect, please contact your HR Business Partner to
          update the employee master record before proceeding.
        </p>
      </div>
    </SectionCard>
  );
}