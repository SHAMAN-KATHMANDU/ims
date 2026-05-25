"use client";

import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
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
      <AuthGuardWithWorkspace
        roles={["admin", "superAdmin"]}
        workspaceSlug={workspace}
      >
        <PermissionGate perm="SALES.WEBSITE_ORDERS.VIEW">
          <WebsiteOrderDetailPage
            id={id}
            backHref={`/${workspace}/sales/website-orders`}
          />
        </PermissionGate>
      </AuthGuardWithWorkspace>
    </EnvFeaturePageGuard>
  );
}
