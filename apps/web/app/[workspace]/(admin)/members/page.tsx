import { PermissionGate } from "@/features/permissions";
import { MembersPage } from "@/features/members";

export const metadata = { title: "Members" };

/** Route shell; orchestration and logic live in the view and hooks. */
export default function Members() {
  return (
    <PermissionGate perm="SETTINGS.MEMBERS.VIEW">
      <MembersPage />
    </PermissionGate>
  );
}
