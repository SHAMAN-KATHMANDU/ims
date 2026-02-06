"use client";

import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import type { CreateOrUpdateVendorData } from "@/hooks/useVendors";
import { useCreateVendor } from "@/hooks/useVendors";
import { VendorForm } from "./components/VendorForm";

export function NewVendorPage() {
  const router = useRouter();
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();
  const createMutation = useCreateVendor();

  const handleSubmit = useCallback(
    async (data: CreateOrUpdateVendorData) => {
      try {
        await createMutation.mutateAsync(data);
        toast({
          title: "Vendor created",
          description: `Vendor "${data.name}" has been created.`,
        });
        router.push(`${basePath}/vendors`);
      } catch (error: unknown) {
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to create vendor",
          variant: "destructive",
        });
      }
    },
    [createMutation, toast, router, basePath],
  );

  const handleCancel = useCallback(() => {
    router.push(`${basePath}/vendors`);
  }, [router, basePath]);

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
        editingVendor={null}
        onSubmit={handleSubmit}
        onReset={() => {}}
        isLoading={createMutation.isPending}
        inline
      />
    </div>
  );
}
