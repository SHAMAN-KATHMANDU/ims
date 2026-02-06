"use client";

import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import type { CreateOrUpdatePromoData } from "@/hooks/usePromos";
import { usePromo, useUpdatePromo } from "@/hooks/usePromos";
import { PromoForm } from "./components/PromoForm";

export function EditPromoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();
  const { data: promo, isLoading: loadingPromo } = usePromo(id);
  const updateMutation = useUpdatePromo();

  const handleSubmit = useCallback(
    async (data: CreateOrUpdatePromoData) => {
      if (!id) return;
      try {
        await updateMutation.mutateAsync({ id, data });
        toast({ title: "Promo code updated successfully" });
        router.push(`${basePath}/promos`);
      } catch (error: unknown) {
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to update promo code",
          variant: "destructive",
        });
      }
    },
    [id, updateMutation, toast, router, basePath],
  );

  const handleCancel = useCallback(() => {
    router.push(`${basePath}/promos`);
  }, [router, basePath]);

  if (loadingPromo || !promo) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link
            href={`${basePath}/promos`}
            className="inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to promos
          </Link>
        </Button>
        <div className="text-muted-foreground">Loading promo...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link
          href={`${basePath}/promos`}
          className="inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to promos
        </Link>
      </Button>

      <PromoForm
        open={true}
        onOpenChange={(open) => !open && handleCancel()}
        editingPromo={promo}
        onSubmit={handleSubmit}
        onReset={() => {}}
        isLoading={updateMutation.isPending}
        inline
      />
    </div>
  );
}
