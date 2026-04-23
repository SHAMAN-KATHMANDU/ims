"use client";

import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useCreatePromo } from "../hooks/use-promos";
import { PromoForm } from "./PromoForm";

export function NewPromoPage() {
  const router = useRouter();
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();
  const createMutation = useCreatePromo();

  const handleSubmit = useCallback(
    async (data: Parameters<typeof createMutation.mutateAsync>[0]) => {
      try {
        await createMutation.mutateAsync(data);
        toast({ title: "Promo code created successfully" });
        router.push(`${basePath}/promos`);
      } catch (error: unknown) {
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to create promo code",
          variant: "destructive",
        });
      }
    },
    [createMutation, toast, router, basePath],
  );

  const handleCancel = useCallback(() => {
    router.push(`${basePath}/promos`);
  }, [router, basePath]);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link
          href={`${basePath}/promos`}
          className="inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to promos
        </Link>
      </Button>

      <PromoForm
        open={true}
        onOpenChange={(open) => !open && handleCancel()}
        editingPromo={null}
        onSubmit={handleSubmit}
        onReset={() => {}}
        isLoading={createMutation.isPending}
        inline
      />
    </div>
  );
}
