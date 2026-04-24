import { TransfersPage } from "@/features/transfers";
import { PermissionGate } from "@/features/permissions";

export const metadata = { title: "Transfers" };

export default function Transfers() {
  return (
    <PermissionGate perm="INVENTORY.TRANSFERS.VIEW">
      <TransfersPage />
    </PermissionGate>
  );
}
