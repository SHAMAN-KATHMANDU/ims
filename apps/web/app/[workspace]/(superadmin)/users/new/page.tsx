import { RoleGuard } from "@/components/auth/role-guard";
import { NewUserPage } from "@/views/users/NewUserPage";

export default function NewUserRoute() {
  return (
    <RoleGuard
      allowedRoles={["superAdmin"]}
      message="Only super administrators can access user management."
    >
      <NewUserPage />
    </RoleGuard>
  );
}
