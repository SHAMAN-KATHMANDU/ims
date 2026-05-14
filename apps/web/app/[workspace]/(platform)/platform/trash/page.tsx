import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { PermissionGate } from "@/features/permissions";
import { TrashPage } from "@/features/trash";

export const metadata = { title: "Platform Trash" };

/** Platform trash — platformAdmin only. No tenant trash. */
export default function PlatformTrashPage() {
  return (
    <AuthGuardWithWorkspace roles={["platformAdmin"]}>
      <PermissionGate perm="SETTINGS.TRASH.VIEW">
        <TrashPage />
      </PermissionGate>
    </AuthGuardWithWorkspace>
  );
}
