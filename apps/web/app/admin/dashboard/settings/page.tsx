import { ProtectedRoute } from "@/components/protected-route"
import { RoleProtectedRoute } from "@/components/role-protected-route"
import { DashboardLayout } from "@/components/dashboard-layout"
import { SettingsPage } from "@/components/pages/settings"

export default function Settings() {
  return (
    <ProtectedRoute>
      <RoleProtectedRoute allowedRoles={["user", "admin", "superAdmin"]}>
        <DashboardLayout>
          <SettingsPage />
        </DashboardLayout>
      </RoleProtectedRoute>
    </ProtectedRoute>
  )
}
