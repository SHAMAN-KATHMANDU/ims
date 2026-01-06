import { ProtectedRoute } from "@/components/protected-route"
import { DashboardLayout } from "@/components/dashboard-layout"
import { HomePage } from "@/components/pages/home"

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <HomePage />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
