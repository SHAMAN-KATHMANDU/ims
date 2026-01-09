import { ProtectedRoute } from "@/components/protected-route"
import { RoleProtectedRoute } from "@/components/role-protected-route"
import { DashboardLayout } from "@/components/dashboard-layout"
import { UsersPage } from "@/components/pages/users"

export default function UsersManagementPage() {
  return (
    <ProtectedRoute>
      <RoleProtectedRoute allowedRoles={["superAdmin"]} fallbackPath="/401">
        <DashboardLayout>
          <UsersPage />
        </DashboardLayout>
      </RoleProtectedRoute>
    </ProtectedRoute>
  )
}
