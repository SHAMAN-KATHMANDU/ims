"use client";

import { use } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { EnvFeaturePageGuard, EnvFeature } from "@/features/flags";
import { WebsiteOrderDetailPage } from "@/features/website-orders";

type Props = {
  params: Promise<{ workspace: string; id: string }>;
};

export default function WebsiteOrderDetailRoute({ params }: Props) {
  const { workspace, id } = use(params);
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.TENANT_WEBSITES}>
      <AuthGuard
        roles={["admin", "superAdmin"]}
        unauthorizedPath={WORKSPACE_ROOT}
      >
        <WebsiteOrderDetailPage
          id={id}
          backHref={`/${workspace}/sales/website-orders`}
        />
      </AuthGuard>
    </EnvFeaturePageGuard>
  );
}
