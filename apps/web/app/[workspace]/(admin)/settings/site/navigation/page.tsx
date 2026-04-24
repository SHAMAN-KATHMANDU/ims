import { PermissionGate } from "@/features/permissions";
import { NavMenuPanel } from "@/features/tenant-site";

export const metadata = { title: "Site navigation" };

export default function SiteNavigationRoute() {
  return (
    <PermissionGate perm="WEBSITE.NAV_MENUS.VIEW">
      <NavMenuPanel />
    </PermissionGate>
  );
}
