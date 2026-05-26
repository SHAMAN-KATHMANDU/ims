"use client";

import { useParams } from "next/navigation";
import { DealDetail } from "@/features/crm";
import { EnvFeaturePageGuard, EnvFeature } from "@/features/flags";

export default function DealDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;

  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.CRM_DEALS}>
      <div className="space-y-6">
        <DealDetail dealId={id} basePath={basePath} />
      </div>
    </EnvFeaturePageGuard>
  );
}
