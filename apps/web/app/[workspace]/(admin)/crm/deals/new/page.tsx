"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/hooks/useToast";
import { useCreateDeal } from "@/features/crm";
import { Button } from "@/components/ui/button";
import { DealForm } from "@/features/crm";
import type { CreateDealData } from "@/features/crm";
import { useFeatureFlag } from "@/features/flags";
import { Feature } from "@repo/shared";
import { notFound } from "next/navigation";

export default function NewDealPage() {
  const allowed = useFeatureFlag(Feature.SALES_PIPELINE);
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const createMutation = useCreateDeal();

  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;

  if (!allowed) notFound();

  const handleSubmit = async (data: CreateDealData) => {
    await createMutation.mutateAsync(data);
    toast({ title: "Deal created" });
    router.push(`${basePath}/crm/deals`);
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`${basePath}/crm/deals`}>
          <Button variant="ghost">Back</Button>
        </Link>
        <h1 className="text-3xl font-bold">New Deal</h1>
      </div>
      <DealForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => router.push(`${basePath}/crm/deals`)}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}
