import { RoleProtectedRoute } from "@/components/role-protected-route";
import { UsersPage } from "@/components/pages/users";

export default function AdminControlsPage() {
  return (
    <RoleProtectedRoute allowedRoles={["superAdmin"]} fallbackPath="/401">
      <UsersPage />
    </RoleProtectedRoute>
  );
}
