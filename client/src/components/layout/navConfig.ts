import type { UserRole } from "@/types/domain";

export interface NavItem {
  label: string;
  to: string;
  icon: string;
  description: string;
  /**
   * Marks a menu entry whose destination depends on the signed-in person.
   * "MY_REVIEW" resolves to the current user's own role clarity review, so the
   * same menu item works for every manager, HOD and HRBP.
   */
  dynamic?: "MY_REVIEW";
}

export const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  EMPLOYEE: [
    {
      label: "My Dashboard",
      to: "/app/dashboard",
      icon: "ri-dashboard-line",
      description: "Your role clarity progress",
    },
    {
      label: "My Assessments",
      to: "/app/assessments",
      icon: "ri-file-list-3-line",
      description: "Role clarity reviews assigned to you",
    },
  ],
  REPORTING_MANAGER: [
    {
      label: "Manager Dashboard",
      to: "/app/dashboard",
      icon: "ri-dashboard-line",
      description: "Pending and completed assessments",
    },
    {
      label: "My Role Clarity",
      to: "my-review",
      icon: "ri-user-star-line",
      description: "Your own role clarity review",
      dynamic: "MY_REVIEW",
    },
    {
      label: "My Team",
      to: "/app/team",
      icon: "ri-group-line",
      description: "Assessments awaiting your rating",
    },
  ],
  HOD: [
    {
      label: "HOD Dashboard",
      to: "/app/dashboard",
      icon: "ri-dashboard-line",
      description: "Sign-offs and alignment cases",
    },
    {
      label: "My Role Clarity",
      to: "my-review",
      icon: "ri-user-star-line",
      description: "Your own role clarity review",
      dynamic: "MY_REVIEW",
    },
    {
      label: "Final Sign-offs",
      to: "/app/signoffs",
      icon: "ri-verified-badge-line",
      description: "Cases awaiting your final sign-off",
    },
  ],
  HRBP: [
    {
      label: "HRBP Dashboard",
      to: "/app/dashboard",
      icon: "ri-dashboard-line",
      description: "Case console and interventions",
    },
    {
      label: "My Role Clarity",
      to: "my-review",
      icon: "ri-user-star-line",
      description: "Your own role clarity review",
      dynamic: "MY_REVIEW",
    },
    {
      label: "Cases",
      to: "/app/cases",
      icon: "ri-briefcase-line",
      description: "Not-aligned cases and conversations",
    },
  ],
  ADMIN: [
    {
      label: "Users",
      to: "/app/users",
      icon: "ri-team-line",
      description: "RefexOne user master directory",
    },
    {
      label: "HR Admin Dashboard",
      to: "/app/dashboard",
      icon: "ri-dashboard-line",
      description: "Organisation-wide overview",
    },
    {
      label: "All Assessments",
      to: "/app/assessments",
      icon: "ri-file-list-3-line",
      description: "Every role clarity review",
    },
    {
      label: "Analytics",
      to: "/app/analytics",
      icon: "ri-bar-chart-box-line",
      description: "Trends, RAG and SLA analysis",
    },
    {
      label: "Master Data",
      to: "/app/admin",
      icon: "ri-settings-4-line",
      description: "Employees, SLA and configuration",
    },
  ],
};