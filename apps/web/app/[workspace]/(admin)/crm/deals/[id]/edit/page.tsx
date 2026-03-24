"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/hooks/useToast";
import { useDeal, useUpdateDeal } from "@/features/crm";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DealForm } from "@/features/crm";
import type { UpdateDealData } from "@/features/crm";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { EnvFeaturePageGuard, FeaturePageGuard } from "@/features/flags";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";

export default function EditDealPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();

  const { data, isLoading } = useDeal(id);
  const updateMutation = useUpdateDeal();
  const deal = data?.deal;

  const pipeline = deal?.pipeline as
    | { stages?: Array<{ name: string }> }
    | undefined;
  const stageNames = (pipeline?.stages ?? []).map((s) => s.name);

  const handleSubmit = async (data: UpdateDealData) => {
    const result = await updateMutation.mutateAsync({ id, data });
    toast({ title: "Deal updated" });
    router.push(`${basePath}/crm/deals/${result.deal.id}`);
  };

  if (isLoading || !deal) {
    return <Skeleton className="h-96 w-full max-w-2xl" />;
  }

  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.CRM_DEALS}>
      <FeaturePageGuard feature={Feature.SALES_PIPELINE}>
        <AuthGuard
          roles={["admin", "superAdmin"]}
          unauthorizedPath={WORKSPACE_ROOT}
        >
          <div className="max-w-2xl">
            <div className="flex items-center gap-4 mb-6">
              <Link href={`${basePath}/crm/deals/${id}`}>
                <Button variant="ghost">Back</Button>
              </Link>
              <h1 className="text-3xl font-bold">Edit Deal</h1>
            </div>
            <DealForm
              mode="edit"
              deal={deal}
              basePath={basePath}
              defaultValues={{
                name: deal.name,
                value: Number(deal.value),
                stage: deal.stage,
                probability: deal.probability,
                expectedCloseDate: deal.expectedCloseDate
                  ? new Date(deal.expectedCloseDate).toISOString().slice(0, 10)
                  : "",
                status: deal.status,
                contactId: deal.contactId ?? undefined,
                companyId: deal.companyId ?? undefined,
                assignedToId: deal.assignedToId ?? "",
                editReason: deal.editReason ?? null,
                stageNames,
              }}
              onSubmit={handleSubmit}
              onCancel={() => router.push(`${basePath}/crm/deals/${id}`)}
              isLoading={updateMutation.isPending}
            />
          </div>
        </AuthGuard>
      </FeaturePageGuard>
    </EnvFeaturePageGuard>
  );
}
