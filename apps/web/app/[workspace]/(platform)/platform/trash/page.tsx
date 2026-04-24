import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { PermissionGate } from "@/features/permissions";
import { TrashPage } from "@/features/trash";

export const metadata = { title: "Platform Trash" };

/** Platform trash — platformAdmin only. No tenant trash. */
export default function PlatformTrashPage() {
  return (
    <AuthGuard roles={["platformAdmin"]} unauthorizedPath={WORKSPACE_ROOT}>
      <PermissionGate perm="SETTINGS.TRASH.VIEW">
        <TrashPage />
      </PermissionGate>
    </AuthGuard>
  );
}
