import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { TrashPage } from "@/views/trash/TrashPage";

/** Trash – admin/superAdmin only. */
export default function Trash() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <TrashPage />
    </AuthGuard>
  );
}
