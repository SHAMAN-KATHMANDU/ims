"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { EnvFeaturePageGuard, EnvFeature } from "@/features/flags";
import { PermissionGate } from "@/features/permissions";
import { WebsiteOrderDetailPage } from "@/features/website-orders";

interface WebsiteOrderDetailClientProps {
  id: string;
  workspace: string;
}

export default function WebsiteOrderDetailClient({
  id,
  workspace,
}: WebsiteOrderDetailClientProps) {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.TENANT_WEBSITES}>
      <AuthGuard
        roles={["admin", "superAdmin"]}
        unauthorizedPath={WORKSPACE_ROOT}
      >
        <PermissionGate perm="SALES.WEBSITE_ORDERS.VIEW">
          <WebsiteOrderDetailPage
            id={id}
            backHref={`/${workspace}/sales/website-orders`}
          />
        </PermissionGate>
      </AuthGuard>
    </EnvFeaturePageGuard>
  );
}
