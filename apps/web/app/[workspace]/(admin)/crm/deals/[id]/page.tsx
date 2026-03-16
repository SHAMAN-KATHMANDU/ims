"use client";

import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import { DealDetail } from "@/features/crm";
import { useFeatureFlag, useEnvFeatureFlag } from "@/features/flags";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";

export default function DealDetailPage() {
  const envAllowed = useEnvFeatureFlag(EnvFeature.CRM_DEALS);
  const planAllowed = useFeatureFlag(Feature.SALES_PIPELINE);
  const params = useParams();
  const id = params.id as string;
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;

  if (!envAllowed || !planAllowed) notFound();

  return (
    <div className="space-y-6">
      <DealDetail dealId={id} basePath={basePath} />
    </div>
  );
}
