import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Avatar from "@/components/base/Avatar";
import { ROLE_META } from "@/constants/clarity";
import { useApp } from "@/store/AppContext";
import { cn, formatDateTime } from "@/lib/utils";

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const {
    currentUser,
    myAssessments,
    employeeById,
    myNotifications,
    markNotificationRead,
    logout,
  } = useApp();
  const [openMenu, setOpenMenu] = useState<"notifications" | "account" | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return myAssessments
      .filter((a) => {
        const emp = employeeById(a.employeeId);
        const haystack = `${emp?.name ?? ""} ${emp?.empId ?? ""} ${
          a.code
        } ${emp?.designation ?? ""} ${emp?.businessUnit ?? ""}`.toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 6);
  }, [query, myAssessments, employeeById]);

  if (!currentUser) return null;

  const unread = myNotifications.filter((n) => !n.read).length;
  const preview = myNotifications.slice(0, 5);

  const close = () => setOpenMenu(null);

  // The subject of a review and the reporting manager use the action workflow;
  // everyone else opens the read-only case file.
  const linkFor = (id: string) => {
    const record = myAssessments.find((a) => a.id === id);
    const empId = currentUser.employeeId;
    if (
      record &&
      empId &&
      (record.employeeId === empId || record.managerId === empId)
    ) {
      return `/app/review/${id}`;
    }
    return `/app/assessments/${id}`;
  };

  const openAssessment = (id: string) => {
    setQuery("");
    navigate(linkFor(id));
  };

  const notificationLink = (id: string) => linkFor(id);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-background-200 bg-background-50 px-3 sm:h-16 sm:gap-3 sm:px-4 md:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-background-100 text-foreground-700 hover:bg-background-200 lg:hidden"
      >
        <i className="ri-menu-line text-xl" />
      </button>

      <div className="relative min-w-0 flex-1 max-w-md">
        <span className="pointer-events-none absolute left-3.5 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center text-foreground-400">
          <i className="ri-search-line text-base" />
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search reviews"
          className="h-9 w-full rounded-full border border-background-200 bg-background-100 pl-9 pr-3 font-label text-sm text-foreground-900 placeholder:text-foreground-400 focus:border-primary-300 focus:bg-background-50 sm:h-10 sm:pl-10 sm:pr-4"
        />

        {query.trim() !== "" && (
          <>
            <button
              type="button"
              aria-label="Close search"
              className="fixed inset-0 z-10 h-full w-full cursor-default"
              onClick={() => setQuery("")}
            />
            <div className="absolute left-0 right-0 top-full z-20 mt-2 animate-scale-in overflow-hidden rounded-lg border border-background-200 bg-background-50">
              {results.length === 0 ? (
                <p className="px-4 py-5 text-center text-xs text-foreground-500">
                  No matching assessments.
                </p>
              ) : (
                results.map((a) => {
                  const emp = employeeById(a.employeeId);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => openAssessment(a.id)}
                      className="flex w-full cursor-pointer items-center gap-3 border-b border-background-100 px-4 py-2.5 text-left last:border-b-0 hover:bg-background-100"
                    >
                      <Avatar name={emp?.name ?? "Unknown"} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-label text-sm font-medium text-foreground-900">
                          {emp?.name ?? "Unknown"}
                        </span>
                        <span className="block truncate text-[11px] text-foreground-500">
                          {emp?.designation} · {a.code}
                        </span>
                      </span>
                      <i className="ri-arrow-right-line text-base text-foreground-400" />
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setOpenMenu(openMenu === "notifications" ? null : "notifications")
            }
            className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-foreground-600 hover:bg-background-100"
          >
            <i className="ri-notification-3-line text-lg" />
            {unread > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-500 px-1 font-label text-[10px] font-semibold text-white">
                {unread}
              </span>
            )}
          </button>

          {openMenu === "notifications" && (
            <>
              <button
                type="button"
                aria-label="Close"
                className="fixed inset-0 z-10 h-full w-full cursor-default"
                onClick={close}
              />
              <div className="absolute right-0 z-20 mt-2 w-[min(20rem,calc(100vw-1.5rem))] animate-scale-in overflow-hidden rounded-lg border border-background-200 bg-background-50">
                <div className="flex items-center justify-between border-b border-background-200 px-4 py-3">
                  <p className="font-heading text-sm font-semibold text-foreground-950">
                    Notifications
                  </p>
                  <span className="font-label text-xs text-foreground-500">
                    {unread} unread
                  </span>
                </div>
                <div className="max-h-80 overflow-y-auto scrollbar-slim">
                  {preview.length === 0 && (
                    <p className="px-4 py-6 text-center text-xs text-foreground-500">
                      No notifications yet.
                    </p>
                  )}
                  {preview.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        markNotificationRead(n.id);
                        navigate(notificationLink(n.assessmentId));
                        close();
                      }}
                      className={cn(
                        "flex w-full cursor-pointer flex-col gap-1 border-b border-background-100 px-4 py-3 text-left hover:bg-background-100",
                        !n.read && "bg-primary-50/60",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {!n.read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                        )}
                        <span className="font-label text-xs font-semibold text-foreground-900">
                          {n.title}
                        </span>
                      </span>
                      <span className="line-clamp-2 text-xs text-foreground-600">
                        {n.message}
                      </span>
                      <span className="text-[10px] text-foreground-400">
                        {formatDateTime(n.createdAt)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === "account" ? null : "account")}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg py-1 pl-1 pr-1 hover:bg-background-100 sm:gap-2 sm:pr-2"
          >
            <Avatar name={currentUser.name} size="sm" />
            <span className="hidden text-left md:block">
              <span className="block font-label text-sm font-medium text-foreground-950">
                {currentUser.name}
              </span>
              <span className="block text-[11px] text-foreground-500">
                {ROLE_META[currentUser.role].short}
              </span>
            </span>
            <i className="ri-arrow-down-s-line text-base text-foreground-500" />
          </button>

          {openMenu === "account" && (
            <>
              <button
                type="button"
                aria-label="Close"
                className="fixed inset-0 z-10 h-full w-full cursor-default"
                onClick={close}
              />
              <div className="absolute right-0 z-20 mt-2 w-[min(18rem,calc(100vw-1.5rem))] animate-scale-in overflow-hidden rounded-lg border border-background-200 bg-background-50">
                <div className="border-b border-background-200 px-4 py-3">
                  <p className="font-label text-sm font-semibold text-foreground-950">
                    {currentUser.name}
                  </p>
                  <p className="mt-0.5 text-xs text-foreground-600">
                    {currentUser.email}
                  </p>
                  <p className="mt-2 text-[11px] text-foreground-500">
                    {ROLE_META[currentUser.role].label}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    close();
                    navigate("/login");
                  }}
                  className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-background-100"
                >
                  <i className="ri-logout-box-r-line text-base text-foreground-500" />
                  <span className="font-label text-sm text-foreground-900">
                    Sign out
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}