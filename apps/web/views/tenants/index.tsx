"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import {
  useTenants,
  useDeactivateTenant,
  type Tenant,
} from "@/hooks/useTenant";
import { TenantTable } from "./components/TenantTable";
import { CreateTenantDialog } from "./components/CreateTenantDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function TenantsPage() {
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();

  const { data: tenants = [], isLoading } = useTenants();
  const deactivateMutation = useDeactivateTenant();
  const [tenantToDeactivate, setTenantToDeactivate] = useState<Tenant | null>(
    null,
  );
  const [createOpen, setCreateOpen] = useState(false);

  const handleDeactivate = (tenant: Tenant) => {
    setTenantToDeactivate(tenant);
  };

  const confirmDeactivate = async () => {
    if (!tenantToDeactivate) return;
    try {
      await deactivateMutation.mutateAsync(tenantToDeactivate.id);
      toast({ title: "Tenant deactivated" });
      setTenantToDeactivate(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to deactivate";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tenants</h1>
          <p className="text-muted-foreground mt-1">
            Manage organizations and their subscriptions
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New tenant
        </Button>
      </div>

      <TenantTable
        tenants={tenants}
        isLoading={isLoading}
        basePath={basePath}
        onDeactivate={handleDeactivate}
      />

      <CreateTenantDialog open={createOpen} onOpenChange={setCreateOpen} />

      <AlertDialog
        open={!!tenantToDeactivate}
        onOpenChange={(open) => !open && setTenantToDeactivate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate tenant?</AlertDialogTitle>
            <AlertDialogDescription>
              {tenantToDeactivate && (
                <>
                  This will deactivate{" "}
                  <strong>{tenantToDeactivate.name}</strong> (
                  {tenantToDeactivate.slug}). Users will not be able to log in
                  until the tenant is activated again.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
