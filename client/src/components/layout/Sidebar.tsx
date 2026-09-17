import { useMemo } from "react";
import { NavLink } from "react-router-dom";
import Logo from "@/components/feature/Logo";
import Avatar from "@/components/base/Avatar";
import { NAV_BY_ROLE, type NavItem } from "@/components/layout/navConfig";
import { ROLE_META } from "@/constants/clarity";
import { useApp } from "@/store/AppContext";
import { cn } from "@/lib/utils";

interface SidebarProps {
  onNavigate?: () => void;
  collapsed?: boolean;
}

export default function Sidebar({ onNavigate, collapsed = false }: SidebarProps) {
  const { currentUser, logout, assessments } = useApp();

  // Leadership roles (Manager, HOD, HRBP) are also employees, so their menu
  // includes a "My Role Clarity" entry that points at their OWN review. It is
  // resolved here because the destination differs for every person.
  const items = useMemo<NavItem[]>(() => {
    if (!currentUser) return [];
    return (NAV_BY_ROLE[currentUser.role] ?? [])
      .map((item) => {
        if (item.dynamic !== "MY_REVIEW") return item;
        const mine = assessments.filter(
          (a) => a.employeeId === currentUser.employeeId,
        );
        const active =
          mine.find((a) => a.status !== "COMPLETED") ?? mine[0] ?? null;
        if (!active) return null;
        return { ...item, to: `/app/review/${active.id}` };
      })
      .filter((item): item is NavItem => item !== null);
  }, [currentUser, assessments]);

  if (!currentUser) return null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background-50">
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-background-200",
          collapsed ? "justify-center px-0" : "px-5",
        )}
      >
        <Logo collapsed={collapsed} />
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-slim px-3 py-4">
        <p
          className={cn(
            "px-3 pb-2 font-label text-[11px] font-semibold uppercase tracking-widest text-foreground-400 transition-opacity duration-200",
            collapsed ? "pointer-events-none h-0 overflow-hidden pb-0 opacity-0" : "opacity-100",
          )}
        >
          {ROLE_META[currentUser.role].label}
        </p>
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={onNavigate}
                title={item.description}
                className={({ isActive }) =>
                  cn(
                    "flex cursor-pointer items-center rounded-xl py-2.5 font-label text-sm transition-colors",
                    collapsed ? "justify-center px-0" : "gap-3 px-3",
                    isActive
                      ? "bg-primary-100 font-semibold text-primary-700"
                      : "font-medium text-foreground-600 hover:bg-background-100 hover:text-foreground-900",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                      <i
                        className={cn(
                          item.icon,
                          "text-lg",
                          isActive ? "text-primary-600" : "text-foreground-400",
                        )}
                      />
                    </span>
                    <span
                      className={cn(
                        "whitespace-nowrap transition-opacity duration-200",
                        collapsed ? "pointer-events-none w-0 overflow-hidden opacity-0" : "opacity-100",
                      )}
                    >
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div
        className={cn(
          "shrink-0 border-t border-background-200",
          collapsed ? "flex flex-col items-center gap-1 px-2 py-3" : "p-3",
        )}
      >
        {collapsed ? (
          <>
            <Avatar name={currentUser.name} size="sm" />
            <button
              type="button"
              onClick={logout}
              title="Sign out"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-foreground-500 hover:bg-background-100 hover:text-foreground-900"
            >
              <i className="ri-logout-box-r-line text-lg" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3 rounded-xl bg-background-100 p-3">
            <Avatar name={currentUser.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-label text-sm font-semibold text-foreground-950">
                {currentUser.name}
              </p>
              <p className="truncate text-[11px] text-foreground-600">
                {currentUser.title}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Sign out"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-foreground-500 hover:bg-background-200 hover:text-foreground-900"
            >
              <i className="ri-logout-box-r-line text-base" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}