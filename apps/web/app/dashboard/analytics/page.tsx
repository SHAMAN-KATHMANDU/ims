import { ProtectedRoute } from "@/components/protected-route"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AnalyticsPage } from "@/components/pages/analytics"

export default function Analytics() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <AnalyticsPage />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
