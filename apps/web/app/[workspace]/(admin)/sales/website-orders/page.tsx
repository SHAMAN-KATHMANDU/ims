import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { EnvFeaturePageGuard, EnvFeature } from "@/features/flags";
import { PermissionGate } from "@/features/permissions";
import { WebsiteOrdersPage } from "@/features/website-orders";

export const metadata = { title: "Website orders" };

type Props = {
  params: Promise<{ workspace: string }>;
};

export default async function WebsiteOrdersRoute({ params }: Props) {
  const { workspace } = await params;
  const base = `/${workspace}/sales/website-orders`;
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.TENANT_WEBSITES}>
      <AuthGuardWithWorkspace roles={["admin", "superAdmin"]}>
        <PermissionGate perm="SALES.WEBSITE_ORDERS.VIEW">
          <WebsiteOrdersPage detailHrefBase={base} />
        </PermissionGate>
      </AuthGuardWithWorkspace>
    </EnvFeaturePageGuard>
  );
}
