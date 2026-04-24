import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { RolesPage } from "@/features/settings/role-management";

export const metadata = { title: "Roles & permissions" };

/** Roles list — gated by `SETTINGS.ROLES.MANAGE` at the component level. */
export default function Page() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <RolesPage />
    </AuthGuard>
  );
}
