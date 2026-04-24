import { BundlesPage } from "@/features/bundles";
import { PermissionGate } from "@/features/permissions";

export const metadata = { title: "Bundles" };

export default function Bundles() {
  return (
    <PermissionGate perm="INVENTORY.BUNDLES.VIEW">
      <BundlesPage />
    </PermissionGate>
  );
}
