import type React from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { RoleProtectedRoute } from "@/components/role-protected-route"
import { DashboardLayout } from "@/components/dashboard-layout"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <RoleProtectedRoute allowedRoles={["admin", "superAdmin"]}>
        <>
          {children}
        </>
      </RoleProtectedRoute>
    </ProtectedRoute>
  )
}