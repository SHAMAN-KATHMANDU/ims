"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import { ArrowLeft, Globe, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/useToast";
import { useTenant } from "@/features/tenants";
import {
  useTenantSiteConfig,
  useEnableTenantWebsite,
  useDisableTenantWebsite,
} from "../hooks/use-tenant-website";
import { TenantNavTabs } from "./TenantNavTabs";

function isNotFoundError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404;
}

export function TenantWebsitePage() {
  const params = useParams();
  const workspace = String(params.workspace ?? "");
  const tenantId = String(params.id ?? "");
  const { toast } = useToast();

  const { data: tenant } = useTenant(tenantId);
  const siteConfigQuery = useTenantSiteConfig(tenantId);
  const enableMutation = useEnableTenantWebsite(tenantId);
  const disableMutation = useDisableTenantWebsite(tenantId);

  const [disableDialogOpen, setDisableDialogOpen] = useState(false);

  const notEnabled =
    siteConfigQuery.isError && isNotFoundError(siteConfigQuery.error);
  const config = siteConfigQuery.data ?? null;
  const websiteEnabled = config?.websiteEnabled ?? false;

  const handleEnable = async () => {
    try {
      await enableMutation.mutateAsync(undefined);
      toast({
        title: websiteEnabled ? "Website re-enabled" : "Website enabled",
        description: tenant?.name,
      });
    } catch (error) {
      toast({
        title: "Failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const confirmDisable = async () => {
    try {
      await disableMutation.mutateAsync();
      toast({ title: "Website disabled" });
    } catch (error) {
      toast({
        title: "Failed to disable",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/${workspace}/platform/tenants`}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Tenants
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">
            {tenant?.name ?? "Loading…"}
          </h1>
          {tenant && (
            <p className="text-sm text-muted-foreground">/{tenant.slug}</p>
          )}
        </div>
      </div>

      <TenantNavTabs
        workspace={workspace}
        tenantId={tenantId}
        active="website"
      />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"
            >
              <Globe className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle>Website feature</CardTitle>
              <CardDescription>
                {notEnabled || !websiteEnabled
                  ? "Not enabled for this tenant."
                  : config?.isPublished
                    ? "Enabled and published."
                    : "Enabled. Tenant hasn't published yet."}
              </CardDescription>
            </div>
          </div>
          <div>
            {notEnabled || !websiteEnabled ? (
              <Button
                onClick={handleEnable}
                disabled={enableMutation.isPending}
              >
                {enableMutation.isPending ? "Enabling…" : "Enable website"}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setDisableDialogOpen(true)}
                disabled={disableMutation.isPending}
              >
                <PowerOff className="mr-2 h-4 w-4" aria-hidden="true" />
                {disableMutation.isPending ? "Disabling…" : "Disable"}
              </Button>
            )}
          </div>
        </CardHeader>
        {websiteEnabled && config && (
          <CardContent className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Published: </span>
              <Badge variant={config.isPublished ? "default" : "secondary"}>
                {config.isPublished ? "Yes" : "No"}
              </Badge>
            </div>
            {config.template && (
              <div>
                <span className="text-muted-foreground">Template: </span>
                <Badge variant="secondary">{config.template.name}</Badge>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <AlertDialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable website?</AlertDialogTitle>
            <AlertDialogDescription>
              Disable the website feature for &quot;{tenant?.name}&quot;? Tenant
              content is preserved but no public traffic will be served.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDisable}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
