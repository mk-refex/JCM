import { Link } from "react-router-dom";
import Button from "@/components/base/Button";
import { StatusBadge, SlaBadge } from "@/components/base/Badge";
import ProgressStepper from "@/components/base/ProgressStepper";
import { useApp } from "@/store/AppContext";
import { actionSectionsFor } from "@/services/assessmentService";
import { effectiveSla } from "@/lib/metrics";
import { normalizeSla } from "@/lib/sla";
import { progressPercent } from "@/lib/workflow";
import { formatDate } from "@/lib/utils";
import { WORKFLOW_STATUS_META } from "@/constants/clarity";
import type { Assessment } from "@/types/domain";

interface MyReviewCardProps {
  reviews: Assessment[];
}

/**
 * Highlights the signed-in person's OWN role clarity review. Leadership roles
 * (Manager, HOD, HRBP) are also employees, so this gives them a clear way into
 * their own initial question and self assessment form.
 */
export default function MyReviewCard({ reviews }: MyReviewCardProps) {
  const { currentUser, employeeById } = useApp();

  const own = reviews;
  const active = own.find((a) => a.status !== "COMPLETED") ?? own[0];
  if (!active) return null;

  const meta = WORKFLOW_STATUS_META[active.status];
  const employee = employeeById(active.employeeId);
  const needsAction = actionSectionsFor(currentUser, [active]).length > 0;

  return (
    <section className="rounded-lg border border-primary-200 bg-primary-50/60 p-5 md:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="font-label text-xs font-semibold uppercase tracking-widest text-primary-600">
            Your own role clarity review
          </p>
          <h2 className="mt-1 font-heading text-lg font-semibold text-foreground-950 md:text-xl">
            {employee?.name} · {active.code}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-foreground-600">
            {needsAction
              ? "This review is about your own role. Continue where you left off to complete your part."
              : "This review is about your own role. It is currently with another stage owner."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={active.status} />
            <SlaBadge status={effectiveSla(active)} />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background-50 px-2.5 py-1 font-label text-xs text-foreground-600">
              <i className="ri-calendar-line text-sm" />
              Due {formatDate(normalizeSla(active.sla, active.status)?.dueAt)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="rounded-lg border border-background-200 bg-background-50 px-5 py-3 text-center">
            <p className="font-label text-xs uppercase tracking-wide text-foreground-500">
              Completion
            </p>
            <p className="mt-1 font-heading text-xl font-semibold text-foreground-950">
              {progressPercent(active.status)}%
            </p>
          </div>
          <Link to={`/app/review/${active.id}`}>
            <Button variant="primary" icon="ri-arrow-right-circle-line">
              {needsAction ? "Continue my review" : "Open my review"}
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-background-200 bg-background-50 p-4 md:p-5">
        <ProgressStepper
          status={active.status}
          conversationRequired={
            !!active.alignmentConversation ||
            active.alignmentStatus === "NOT_ALIGNED"
          }
          closedAtInitialCheck={
            active.status === "COMPLETED" &&
            active.initialClarityResponse === "YES"
          }
        />
        <p className="mt-4 text-xs text-foreground-500">{meta.description}</p>
      </div>
    </section>
  );
}