import { Link, useNavigate } from "react-router-dom";
import Avatar from "@/components/base/Avatar";
import { RagBadge, SlaBadge, StatusBadge, AlignmentBadge } from "@/components/base/Badge";
import EmptyState from "@/components/base/EmptyState";
import Pagination from "@/components/base/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { useApp } from "@/store/AppContext";
import { derivedGap, derivedRag, effectiveSla } from "@/lib/metrics";
import { normalizeSla } from "@/lib/sla";
import { formatDate } from "@/lib/utils";
import type { Assessment } from "@/types/domain";

interface AssessmentTableProps {
  assessments: Assessment[];
  emptyTitle?: string;
  emptyDescription?: string;
  showAlignment?: boolean;
  /** Disable paging for tiny preview lists */
  paginate?: boolean;
  resetKey?: string | number;
}

export default function AssessmentTable({
  assessments,
  emptyTitle = "No assessments found",
  emptyDescription = "Nothing matches the current filters.",
  showAlignment = false,
  paginate = true,
  resetKey,
}: AssessmentTableProps) {
  const { employeeById, currentUser } = useApp();
  const navigate = useNavigate();
  const paging = usePagination(assessments, { resetKey });
  const rows = paginate ? paging.pageItems : assessments;

  // The subject of a review and the reporting manager use the action workflow;
  // everyone else opens the read-only case file.
  const reviewHref = (a: Assessment) => {
    const id = currentUser?.employeeId;
    if (id && (a.employeeId === id || a.managerId === id)) {
      return `/app/review/${a.id}`;
    }
    return `/app/assessments/${a.id}`;
  };

  if (!assessments.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <>
      <div className="flex flex-col gap-2 p-3 md:hidden">
        {rows.map((a) => {
          const emp = employeeById(a.employeeId);
          const sla = effectiveSla(a);
          return (
            <Link
              key={a.id}
              to={reviewHref(a)}
              className="rounded-lg border border-background-200 bg-background-50 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={emp?.name ?? "Unknown"} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-label text-sm font-semibold text-foreground-950">
                      {emp?.name ?? "Unknown employee"}
                    </p>
                    <p className="truncate text-xs text-foreground-500">
                      {a.code}
                      {emp?.designation ? ` · ${emp.designation}` : ""}
                    </p>
                  </div>
                </div>
                <i className="ri-arrow-right-s-line text-lg text-foreground-400" />
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <StatusBadge status={a.status} />
                <SlaBadge status={sla} />
                <RagBadge rag={derivedRag(a)} />
                {showAlignment && <AlignmentBadge status={a.alignmentStatus} />}
              </div>
            </Link>
          );
        })}
      </div>
      <div className="hidden overflow-x-auto scrollbar-slim md:block">
        <table className="w-full min-w-[860px] border-collapse text-left">
          <thead>
            <tr className="border-b border-background-200">
              <th className="px-3 py-3 font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                Employee
              </th>
              <th className="px-3 py-3 font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                Role / Business Unit
              </th>
              <th className="px-3 py-3 font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                Stage
              </th>
              <th className="px-3 py-3 font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                SLA due
              </th>
              <th className="px-3 py-3 font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                Gap
              </th>
              <th className="px-3 py-3 font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                RAG
              </th>
              {showAlignment && (
                <th className="px-3 py-3 font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                  Alignment
                </th>
              )}
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const emp = employeeById(a.employeeId);
              const sla = effectiveSla(a);
              const gap = derivedGap(a);
              return (
                <tr
                  key={a.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(reviewHref(a))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(reviewHref(a));
                    }
                  }}
                  className="cursor-pointer border-b border-background-100 transition-colors hover:bg-background-100/80"
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={emp?.name ?? "Unknown"} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-label text-sm font-medium text-foreground-950">
                          {emp?.name ?? "Unknown employee"}
                        </p>
                        <p className="truncate text-xs text-foreground-500">
                          {emp?.empId} · {a.code}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <p className="truncate text-sm text-foreground-800">
                      {emp?.designation}
                    </p>
                    <p className="truncate text-xs text-foreground-500">
                      {emp?.businessUnit}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1.5">
                      <SlaBadge status={sla} />
                      <span className="text-xs text-foreground-500">
                        {formatDate(normalizeSla(a.sla, a.status)?.dueAt)}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-label text-sm font-semibold text-foreground-900">
                      {gap === null ? "—" : `${gap > 0 ? "+" : ""}${gap}`}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <RagBadge rag={derivedRag(a)} />
                  </td>
                  {showAlignment && (
                    <td className="px-3 py-3">
                      <AlignmentBadge status={a.alignmentStatus} />
                    </td>
                  )}
                  <td className="px-3 py-3 text-right">
                    <Link
                      to={reviewHref(a)}
                      className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1.5 font-label text-xs font-medium text-primary-700 hover:bg-primary-50"
                    >
                      Open
                      <i className="ri-arrow-right-line text-sm" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {paginate && (
        <Pagination
          page={paging.page}
          pageSize={paging.pageSize}
          totalItems={paging.totalItems}
          totalPages={paging.totalPages}
          from={paging.from}
          to={paging.to}
          onPageChange={paging.setPage}
          onPageSizeChange={paging.setPageSize}
          itemLabel="assessments"
        />
      )}
    </>
  );
}
