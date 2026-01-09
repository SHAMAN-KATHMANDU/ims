import { ProtectedRoute } from "@/components/protected-route"
import { RoleProtectedRoute } from "@/components/role-protected-route"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AdminSettings } from "@/components/pages/admin-settings"

export default function AdminPage() {
  return (
    <ProtectedRoute>
      <RoleProtectedRoute allowedRoles={["superAdmin"]} fallbackPath="/dashboard">
        <DashboardLayout>
          <AdminSettings />
        </DashboardLayout>
      </RoleProtectedRoute>
    </ProtectedRoute>
  )
}
