"use client";

import { useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useActiveLocations } from "@/hooks/useLocation";
import { useCreateSale } from "@/hooks/useSales";
import { NewSaleForm } from "./components/NewSaleForm";
import { useIsMobile } from "@/hooks/useMobile";

export function NewSalePage() {
  const router = useRouter();
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { data: locations = [] } = useActiveLocations();
  const createSaleMutation = useCreateSale();

  const handleSubmit = useCallback(
    async (data: Parameters<typeof createSaleMutation.mutateAsync>[0]) => {
      try {
        await createSaleMutation.mutateAsync(data);
        toast({ title: "Sale completed successfully" });
        router.push(`${basePath}/sales`);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to create sale";
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      }
    },
    [createSaleMutation, toast, router, basePath],
  );

  const handleCancel = useCallback(() => {
    router.push(`${basePath}/sales`);
  }, [router, basePath]);

  useEffect(() => {
    if (!isMobile) {
      router.replace(`${basePath}/sales?add=1`);
    }
  }, [isMobile, router, basePath]);

  if (!isMobile) {
    return <div className="p-6 text-muted-foreground">Redirecting...</div>;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link
          href={`${basePath}/sales`}
          className="inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sales
        </Link>
      </Button>

      <NewSaleForm
        open={true}
        onOpenChange={(open) => !open && handleCancel()}
        locations={locations}
        onSubmit={handleSubmit}
        isLoading={createSaleMutation.isPending}
        inline
      />
    </div>
  );
}
