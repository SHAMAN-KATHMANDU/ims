import { ProtectedRoute } from "@/components/protected-route"
import { RoleProtectedRoute } from "@/components/role-protected-route"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProductPage } from "@/components/pages/product/index"

export default function Product() {
  return (
    <ProtectedRoute>
      <RoleProtectedRoute allowedRoles={["user", "admin", "superAdmin"]}>
        <DashboardLayout>
          <ProductPage />
        </DashboardLayout>
      </RoleProtectedRoute>
    </ProtectedRoute>
  )
}
