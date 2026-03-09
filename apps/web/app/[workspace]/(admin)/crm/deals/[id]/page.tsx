"use client";

import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import { DealDetail } from "@/features/crm";
import { useFeatureFlag } from "@/features/flags";
import { Feature } from "@repo/shared";

export default function DealDetailPage() {
  const allowed = useFeatureFlag(Feature.SALES_PIPELINE);
  const params = useParams();
  const id = params.id as string;
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;

  if (!allowed) notFound();

  return (
    <div className="space-y-6">
      <DealDetail dealId={id} basePath={basePath} />
    </div>
  );
}
