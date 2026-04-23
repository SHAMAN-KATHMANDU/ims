"use client";

import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import {
  useLocation as useLocationById,
  useUpdateLocation,
} from "../hooks/use-locations";
import { LocationForm } from "./LocationForm";

export function EditLocationPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();
  const { data: location, isLoading: loadingLocation } = useLocationById(id);
  const updateMutation = useUpdateLocation();

  const handleSubmit = useCallback(
    async (data: {
      name: string;
      type: "WAREHOUSE" | "SHOWROOM";
      address: string;
      isDefaultWarehouse?: boolean;
    }) => {
      if (!id) return;
      try {
        await updateMutation.mutateAsync({
          id,
          data: {
            name: data.name,
            type: data.type,
            address: data.address || undefined,
            isDefaultWarehouse: data.isDefaultWarehouse ?? false,
          },
        });
        toast({ title: "Location updated successfully" });
        router.push(`${basePath}/locations`);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to update location";
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      }
    },
    [id, updateMutation, toast, router, basePath],
  );

  const handleCancel = useCallback(() => {
    router.push(`${basePath}/locations`);
  }, [router, basePath]);

  if (loadingLocation || !location) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link
            href={`${basePath}/locations`}
            className="inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to locations
          </Link>
        </Button>
        <div className="text-muted-foreground">Loading location...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link
            href={`${basePath}/locations`}
            className="inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to locations
          </Link>
        </Button>
      </div>

      <LocationForm
        open={true}
        onOpenChange={(open) => !open && handleCancel()}
        editingLocation={location}
        onSubmit={handleSubmit}
        onReset={() => {}}
        isLoading={updateMutation.isPending}
        inline
      />
    </div>
  );
}
