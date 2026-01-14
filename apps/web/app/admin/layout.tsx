import type React from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { RoleProtectedRoute } from "@/components/role-protected-route";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <RoleProtectedRoute allowedRoles={["user", "admin", "superAdmin"]}>
        <>{children}</>
      </RoleProtectedRoute>
    </ProtectedRoute>
  );
}
