"use client";

import { useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useCreateLocation } from "@/hooks/useLocation";
import { LocationForm } from "./components/LocationForm";
import { useIsMobile } from "@/hooks/useMobile";

export function NewLocationPage() {
  const router = useRouter();
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const createMutation = useCreateLocation();

  const handleSubmit = useCallback(
    async (data: {
      name: string;
      type: "WAREHOUSE" | "SHOWROOM";
      address: string;
      isDefaultWarehouse?: boolean;
    }) => {
      try {
        await createMutation.mutateAsync({
          name: data.name,
          type: data.type,
          address: data.address || undefined,
          isDefaultWarehouse: data.isDefaultWarehouse,
        });
        toast({ title: "Location created successfully" });
        router.push(`${basePath}/locations`);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to create location";
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      }
    },
    [createMutation, toast, router, basePath],
  );

  const handleCancel = useCallback(() => {
    router.push(`${basePath}/locations`);
  }, [router, basePath]);

  useEffect(() => {
    if (!isMobile) {
      router.replace(`${basePath}/locations?add=1`);
    }
  }, [isMobile, router, basePath]);

  if (!isMobile) {
    return <div className="p-6 text-muted-foreground">Redirecting...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link
            href={`${basePath}/locations`}
            className="inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to locations
          </Link>
        </Button>
      </div>

      <LocationForm
        open={true}
        onOpenChange={(open) => !open && handleCancel()}
        editingLocation={null}
        onSubmit={handleSubmit}
        onReset={() => {}}
        isLoading={createMutation.isPending}
        inline
      />
    </div>
  );
}
