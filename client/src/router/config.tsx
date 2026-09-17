import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/login/page";
import SsoCallbackPage from "@/pages/sso-callback/page";
import AppShell from "@/components/layout/AppShell";
import Dashboard from "@/pages/dashboard/page";
import AssessmentsList from "@/pages/assessments/page";
import AssessmentDetail from "@/pages/assessments/detail/page";
import ReviewPage from "@/pages/review/page";
import TeamPage from "@/pages/team/page";
import SignoffsPage from "@/pages/signoffs/page";
import CasesPage from "@/pages/cases/page";
import AnalyticsPage from "@/pages/analytics/page";
import AdminPage from "@/pages/admin/page";
import UsersPage from "@/pages/users/page";

const routes: RouteObject[] = [
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/sso/callback",
    element: <SsoCallbackPage />,
  },
  {
    path: "/app",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "assessments", element: <AssessmentsList /> },
      { path: "assessments/:id", element: <AssessmentDetail /> },
      { path: "review/:id", element: <ReviewPage /> },
      { path: "team", element: <TeamPage /> },
      { path: "signoffs", element: <SignoffsPage /> },
      { path: "cases", element: <CasesPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "users", element: <UsersPage /> },
      { path: "admin", element: <AdminPage /> },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export default routes;