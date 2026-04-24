import { PermissionGate } from "@/features/permissions";
import { SalesPage } from "@/features/sales";

export const metadata = { title: "Sales" };

/** Route shell; orchestration and logic live in the view and hooks. */
export default function Sales() {
  return (
    <PermissionGate perm="SALES.SALES.VIEW">
      <SalesPage />
    </PermissionGate>
  );
}
