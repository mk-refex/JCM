import { PAGE_SIZE_OPTIONS, type PageSize } from "@/hooks/usePagination";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  pageSize: PageSize;
  totalItems: number;
  totalPages: number;
  from: number;
  to: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
  className?: string;
  itemLabel?: string;
}

export default function Pagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  from,
  to,
  onPageChange,
  onPageSizeChange,
  className,
  itemLabel = "items",
}: PaginationProps) {
  if (totalItems === 0) return null;

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-background-200 bg-background-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="font-label text-xs text-foreground-600 sm:text-sm">
        Showing <span className="font-semibold text-foreground-900">{from}</span>
        –<span className="font-semibold text-foreground-900">{to}</span> of{" "}
        <span className="font-semibold text-foreground-900">{totalItems}</span>{" "}
        {itemLabel}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 font-label text-xs text-foreground-600">
          <span className="whitespace-nowrap">Rows per page</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value) as PageSize)}
            className="h-8 cursor-pointer rounded-md border border-background-300 bg-background-50 px-2 font-label text-sm text-foreground-800 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => onPageChange(1)}
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-foreground-700 hover:bg-background-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="First page"
          >
            <i className="ri-skip-back-mini-line text-base" />
          </button>
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-foreground-700 hover:bg-background-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous page"
          >
            <i className="ri-arrow-left-s-line text-lg" />
          </button>
          <span className="min-w-[4.5rem] text-center font-label text-xs text-foreground-700">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={!canNext}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-foreground-700 hover:bg-background-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next page"
          >
            <i className="ri-arrow-right-s-line text-lg" />
          </button>
          <button
            type="button"
            disabled={!canNext}
            onClick={() => onPageChange(totalPages)}
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-foreground-700 hover:bg-background-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Last page"
          >
            <i className="ri-skip-forward-mini-line text-base" />
          </button>
        </div>
      </div>
    </div>
  );
}
