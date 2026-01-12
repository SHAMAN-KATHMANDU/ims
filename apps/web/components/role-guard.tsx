"use client"

import { type ReactNode } from "react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getUserRole, type UserRole } from "@/utils/auth"

interface RoleGuardProps {
  /**
   * Array of roles that are allowed to access the content
   */
  allowedRoles: UserRole[]
  /**
   * Content to render if user has required role
   */
  children: ReactNode
  /**
   * Optional custom fallback UI to show when access is denied
   * If not provided, shows default access denied message
   */
  fallback?: ReactNode
  /**
   * Optional custom message to show in the default access denied UI
   */
  message?: string
}

/**
 * RoleGuard Component
 * 
 * A reusable wrapper component for role-based access control.
 * Checks if the current user has one of the allowed roles and renders
 * children if authorized, or shows an access denied message if not.
 * 
 * @example
 * ```tsx
 * <RoleGuard allowedRoles={["superAdmin"]}>
 *   <AdminPanel />
 * </RoleGuard>
 * ```
 * 
 * @example
 * ```tsx
 * <RoleGuard 
 *   allowedRoles={["admin", "superAdmin"]}
 *   message="Only administrators can access this section"
 * >
 *   <AdminContent />
 * </RoleGuard>
 * ```
 */
export function RoleGuard({ 
  allowedRoles, 
  children, 
  fallback,
  message = "You do not have permission to access this content."
}: RoleGuardProps) {
  const userRole = getUserRole()

  // Check if user has one of the allowed roles
  const isAuthorized = userRole !== null && allowedRoles.includes(userRole)

  // If not authorized, show fallback or default access denied UI
  if (!isAuthorized) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // User is authorized, render children
  return <>{children}</>
}
