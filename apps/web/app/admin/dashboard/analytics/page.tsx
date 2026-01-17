import { RoleProtectedRoute } from "@/components/role-protected-route";
import { AnalyticsPage } from "@/components/pages/analytics";

export default function Analytics() {
  return (
    <RoleProtectedRoute
      allowedRoles={["admin", "superAdmin"]}
      fallbackPath="/dashboard"
    >
      <AnalyticsPage />
    </RoleProtectedRoute>
  );
}
