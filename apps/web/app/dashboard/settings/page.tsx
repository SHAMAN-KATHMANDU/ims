import { ProtectedRoute } from "@/components/protected-route"
import { DashboardLayout } from "@/components/dashboard-layout"
import { SettingsPage } from "@/components/pages/settings"

export default function Settings() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <SettingsPage />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
