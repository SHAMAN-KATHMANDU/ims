"use client";

import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/hooks/useToast";
import { useActiveLocations } from "@/features/locations";
import { getLocationInventory } from "@/features/analytics";
import {
  useCreateTransfer,
  useApproveTransfer,
  useStartTransit,
  useCompleteTransfer,
} from "../hooks/use-transfers";
import { TransferForm } from "./TransferForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

/**
 * Dedicated page for creating a transfer request only.
 * List and manage transfers remain on the main Transfers page.
 */
export function CreateTransferPage() {
  const router = useRouter();
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();

  const { data: locations = [] } = useActiveLocations();
  const createTransferMutation = useCreateTransfer();
  const approveTransferMutation = useApproveTransfer();
  const startTransitMutation = useStartTransit();
  const completeTransferMutation = useCompleteTransfer();

  const fetchLocationInventory = useCallback(
    async (
      locationId: string,
      params?: { search?: string; limit?: number },
    ) => {
      const response = await getLocationInventory(locationId, {
        limit: params?.limit ?? 50,
        search: params?.search ?? "",
      });
      return response.data;
    },
    [],
  );

  const handleSubmit = useCallback(
    async (
      data: Parameters<typeof createTransferMutation.mutateAsync>[0],
      completeNow?: boolean,
    ) => {
      try {
        const transfer = await createTransferMutation.mutateAsync(data);
        if (completeNow !== false) {
          await approveTransferMutation.mutateAsync(transfer.id);
          await startTransitMutation.mutateAsync(transfer.id);
          await completeTransferMutation.mutateAsync(transfer.id);
          toast({
            title: "Transfer completed",
            description:
              "Stock has been moved from source to destination location.",
          });
        } else {
          toast({ title: "Transfer created successfully" });
        }
        router.push(`${basePath}/transfers`);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to create transfer";
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      }
    },
    [
      createTransferMutation,
      approveTransferMutation,
      startTransitMutation,
      completeTransferMutation,
      toast,
      router,
      basePath,
    ],
  );

  const handleCancel = useCallback(() => {
    router.push(`${basePath}/transfers`);
  }, [router, basePath]);

  const canCreateTransfer = locations.length >= 2;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Create transfer request</h1>
          <p className="text-muted-foreground mt-2">
            Request a product transfer from one location to another
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link
            href={`${basePath}/transfers`}
            className="inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to transfers
          </Link>
        </Button>
      </div>

      {!canCreateTransfer ? (
        <div className="rounded-lg border border-border bg-muted/30 p-8 text-center">
          <p className="text-muted-foreground mb-4">
            {locations.length === 0
              ? "You need at least two locations to create transfers. Complete setup or add warehouses and showrooms in Locations."
              : "You need at least two locations to create transfers. Add another location in Locations."}
          </p>
          <Link
            href={
              locations.length === 0
                ? `${basePath}/onboarding`
                : `${basePath}/locations/new`
            }
            className="text-primary underline hover:no-underline font-medium"
          >
            {locations.length === 0 ? "Complete setup" : "Add location"}
          </Link>
        </div>
      ) : (
        <TransferForm
          open={true}
          onOpenChange={(open) => !open && handleCancel()}
          locations={locations}
          onSubmit={handleSubmit}
          isLoading={
            createTransferMutation.isPending ||
            approveTransferMutation.isPending ||
            startTransitMutation.isPending ||
            completeTransferMutation.isPending
          }
          getLocationInventory={fetchLocationInventory}
          inline
        />
      )}
    </div>
  );
}
