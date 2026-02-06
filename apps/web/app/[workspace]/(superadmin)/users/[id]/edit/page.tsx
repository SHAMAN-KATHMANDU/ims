import { RoleGuard } from "@/components/auth/role-guard";
import { EditUserPage } from "@/views/users/EditUserPage";

export default function EditUserRoute() {
  return (
    <RoleGuard
      allowedRoles={["superAdmin"]}
      message="Only super administrators can access user management."
    >
      <EditUserPage />
    </RoleGuard>
  );
}
