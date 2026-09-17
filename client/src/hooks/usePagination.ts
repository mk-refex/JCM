import { useEffect, useMemo, useState } from "react";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 25;
const STORAGE_KEY = "jcs.pageSize";

export function readStoredPageSize(fallback: PageSize = DEFAULT_PAGE_SIZE): PageSize {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const value = Number(raw);
    if (PAGE_SIZE_OPTIONS.includes(value as PageSize)) return value as PageSize;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function storePageSize(size: PageSize) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(size));
  } catch {
    /* ignore */
  }
}

export interface PaginationState<T> {
  page: number;
  pageSize: PageSize;
  totalItems: number;
  totalPages: number;
  from: number;
  to: number;
  pageItems: T[];
  setPage: (page: number) => void;
  setPageSize: (size: PageSize) => void;
}

export function usePagination<T>(
  items: T[],
  options?: { resetKey?: string | number; initialPageSize?: PageSize },
): PaginationState<T> {
  const [pageSize, setPageSizeState] = useState<PageSize>(
    () => options?.initialPageSize ?? readStoredPageSize(),
  );
  const [page, setPage] = useState(1);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1);

  useEffect(() => {
    setPage(1);
  }, [options?.resetKey, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  const setPageSize = (size: PageSize) => {
    storePageSize(size);
    setPageSizeState(size);
    setPage(1);
  };

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    from,
    to,
    pageItems,
    setPage,
    setPageSize,
  };
}
