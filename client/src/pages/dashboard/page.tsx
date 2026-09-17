import { useApp } from "@/store/AppContext";
import EmployeeDashboard from "@/pages/dashboard/components/EmployeeDashboard";
import ManagerDashboard from "@/pages/dashboard/components/ManagerDashboard";
import HodDashboard from "@/pages/dashboard/components/HodDashboard";
import HrbpDashboard from "@/pages/dashboard/components/HrbpDashboard";
import AdminDashboard from "@/pages/dashboard/components/AdminDashboard";

export default function Dashboard() {
  const { currentUser } = useApp();

  switch (currentUser?.role) {
    case "EMPLOYEE":
      return <EmployeeDashboard />;
    case "REPORTING_MANAGER":
      return <ManagerDashboard />;
    case "HOD":
      return <HodDashboard />;
    case "HRBP":
      return <HrbpDashboard />;
    case "ADMIN":
      return <AdminDashboard />;
    default:
      return null;
  }
}