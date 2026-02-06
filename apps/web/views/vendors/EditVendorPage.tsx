"use client";

import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import type { CreateOrUpdateVendorData } from "@/hooks/useVendors";
import { useVendor, useUpdateVendor } from "@/hooks/useVendors";
import { VendorForm } from "./components/VendorForm";

export function EditVendorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();
  const { data: vendor, isLoading: loadingVendor } = useVendor(id);
  const updateMutation = useUpdateVendor();

  const handleSubmit = useCallback(
    async (data: CreateOrUpdateVendorData) => {
      if (!id) return;
      try {
        await updateMutation.mutateAsync({ id, data });
        toast({
          title: "Vendor updated",
          description: `Vendor "${data.name}" has been updated.`,
        });
        router.push(`${basePath}/vendors`);
      } catch (error: unknown) {
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to update vendor",
          variant: "destructive",
        });
      }
    },
    [id, updateMutation, toast, router, basePath],
  );

  const handleCancel = useCallback(() => {
    router.push(`${basePath}/vendors`);
  }, [router, basePath]);

  if (loadingVendor || !vendor) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link
            href={`${basePath}/vendors`}
            className="inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to vendors
          </Link>
        </Button>
        <div className="text-muted-foreground">Loading vendor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link
          href={`${basePath}/vendors`}
          className="inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to vendors
        </Link>
      </Button>

      <VendorForm
        open={true}
        onOpenChange={(open) => !open && handleCancel()}
        editingVendor={vendor}
        onSubmit={handleSubmit}
        onReset={() => {}}
        isLoading={updateMutation.isPending}
        inline
      />
    </div>
  );
}
