"use client";

import { useParams } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { DealDetail } from "@/features/crm";
import { EnvFeaturePageGuard, FeaturePageGuard } from "@/features/flags";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";

export default function DealDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;

  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.CRM_DEALS}>
      <FeaturePageGuard feature={Feature.SALES_PIPELINE}>
        <AuthGuard
          roles={["admin", "superAdmin"]}
          unauthorizedPath={WORKSPACE_ROOT}
        >
          <div className="space-y-6">
            <DealDetail dealId={id} basePath={basePath} />
          </div>
        </AuthGuard>
      </FeaturePageGuard>
    </EnvFeaturePageGuard>
  );
}
