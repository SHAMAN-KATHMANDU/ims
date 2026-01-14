import { ProtectedRoute } from "@/components/protected-route";
import { RoleProtectedRoute } from "@/components/role-protected-route";
import { DashboardLayout } from "@/components/dashboard-layout";
import { HomePage } from "@/components/pages/home";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <RoleProtectedRoute allowedRoles={["user", "admin", "superAdmin"]}>
        <DashboardLayout>
          <HomePage />
        </DashboardLayout>
      </RoleProtectedRoute>
    </ProtectedRoute>
  );
}
