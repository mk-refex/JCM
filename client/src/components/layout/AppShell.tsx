import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { useApp } from "@/store/AppContext";
import { cn } from "@/lib/utils";

export default function AppShell() {
  const { currentUser, authReady } = useApp();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-100">
        <p className="font-label text-sm text-foreground-600">
          Restoring session…
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-dvh bg-background-100">
      <aside
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-background-200 bg-background-50 transition-[width] duration-300 ease-out lg:flex lg:flex-col",
          sidebarExpanded ? "w-64 shadow-lg" : "w-[76px]",
        )}
      >
        <Sidebar collapsed={!sidebarExpanded} />
      </aside>
      <div className="hidden w-[76px] shrink-0 lg:block" aria-hidden="true" />

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 h-full w-full bg-foreground-950/50"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 animate-slide-in-right flex-col border-r border-background-200">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <Topbar onMenuClick={() => setDrawerOpen(true)} />
        <main className="min-w-0 flex-1 px-3 py-2 sm:px-4 sm:py-3 md:px-5 md:py-4">
          <div className="mx-auto w-full max-w-[1400px] animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}