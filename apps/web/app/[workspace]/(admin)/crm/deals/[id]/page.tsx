"use client";

import { useParams } from "next/navigation";
import { DealDetail } from "@/views/crm/deals/DealDetail";

export default function DealDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;

  return (
    <div className="space-y-6">
      <DealDetail dealId={id} basePath={basePath} />
    </div>
  );
}
