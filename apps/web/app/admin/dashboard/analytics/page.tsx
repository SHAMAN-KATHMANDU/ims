import { ProtectedRoute } from "@/components/protected-route"
import { RoleProtectedRoute } from "@/components/role-protected-route"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AnalyticsPage } from "@/components/pages/analytics"

export default function Analytics() {
  return (
    <ProtectedRoute>
      <RoleProtectedRoute allowedRoles={["admin", "superAdmin"]} fallbackPath="/dashboard">
        <DashboardLayout>
          <AnalyticsPage />
        </DashboardLayout>
      </RoleProtectedRoute>
    </ProtectedRoute>
  )
}
