"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/useToast";
import { useBundle, useUpdateBundle } from "../hooks/use-bundles";
import { ProductPickerDialog } from "@/features/tenant-site/components/ProductPickerDialog";
import type { CreateBundleData } from "../types";
import { BundleForm } from "./BundleForm";

interface EditBundlePageProps {
  bundleId: string;
}

export function EditBundlePage({ bundleId }: EditBundlePageProps) {
  const params = useParams<{ workspace: string }>();
  const workspace = params?.workspace ?? "";
  const router = useRouter();
  const { toast } = useToast();
  const { data: bundle, isLoading, isError, refetch } = useBundle(bundleId);
  const updateMutation = useUpdateBundle();

  const [open, setOpen] = useState(true);
  const [productPickerOpen, setProductPickerOpen] = useState(false);

  const handleSubmit = async (data: CreateBundleData) => {
    try {
      await updateMutation.mutateAsync({ id: bundleId, data });
      toast({ title: "Bundle updated" });
      router.push(`/${workspace}/products/bundles`);
    } catch (err) {
      toast({
        title: "Failed to update bundle",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
      throw err;
    }
  };

  const handleSaveProducts = async (productIds: string[]) => {
    try {
      await updateMutation.mutateAsync({
        id: bundleId,
        data: { ...bundle!, productIds },
      });
      toast({ title: "Products updated" });
      refetch();
    } catch (err) {
      toast({
        title: "Failed to update products",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href={`/${workspace}/products/bundles`}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to bundles
          </Link>
        </Button>
        {bundle && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setProductPickerOpen(true)}
          >
            Manage products
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="max-w-3xl space-y-4">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80" />
          <div className="space-y-3 pt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      )}

      {isError && (
        <div className="flex items-center justify-between rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          <span className="text-destructive">Couldn&apos;t load bundle.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </div>
      )}

      {bundle && (
        <>
          <BundleForm
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              if (!o) router.push(`/${workspace}/products/bundles`);
            }}
            editingBundle={bundle}
            onSubmit={handleSubmit}
            onReset={() => {}}
            isLoading={updateMutation.isPending}
            inline
          />

          {/* Product Picker Dialog */}
          <ProductPickerDialog
            open={productPickerOpen}
            onOpenChange={setProductPickerOpen}
            initialProductIds={bundle.productIds}
            onSave={handleSaveProducts}
            isSaving={updateMutation.isPending}
            title="Manage Bundle Products"
          />
        </>
      )}
    </div>
  );
}
