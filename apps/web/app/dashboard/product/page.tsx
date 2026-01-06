import { ProtectedRoute } from "@/components/protected-route"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProductPage } from "@/components/pages/product"

export default function Product() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <ProductPage />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
