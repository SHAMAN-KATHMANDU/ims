"use client";

import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCreateLocation } from "@/features/locations";
import { useToast } from "@/hooks/useToast";
import { LocationForm } from "@/features/locations";

export function OnboardingPage() {
  const router = useRouter();
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
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
          isDefaultWarehouse: data.type === "WAREHOUSE" ? true : undefined,
        });
        toast({
          title: "Setup complete! You can now add products and create sales.",
        });
        router.replace(basePath);
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

  return (
    <div className="mx-auto max-w-lg space-y-6 py-8">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">
          Welcome! Let&apos;s get started
        </h1>
        <p className="text-muted-foreground">
          Create your default warehouse to start adding products, making sales,
          and managing inventory.
        </p>
      </div>

      <LocationForm
        open={true}
        onOpenChange={() => {}}
        editingLocation={null}
        defaultValues={{
          name: "Main Location",
          type: "WAREHOUSE",
          isDefaultWarehouse: true,
        }}
        onSubmit={handleSubmit}
        onReset={() => {}}
        isLoading={createMutation.isPending}
        inline
      />

      <p className="text-center text-xs text-muted-foreground">
        You can add more warehouses and showrooms later in{" "}
        <a
          href={`${basePath}/locations`}
          className="underline hover:no-underline"
        >
          Locations
        </a>
        .
      </p>
    </div>
  );
}
