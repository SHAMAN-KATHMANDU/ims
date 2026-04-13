"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import { ArrowLeft, Globe, PowerOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import { useTenant } from "@/features/tenants";
import {
  useTenantSiteConfig,
  useEnableTenantWebsite,
  useDisableTenantWebsite,
  useSiteTemplates,
  type SiteTemplate,
} from "../hooks/use-tenant-website";
import { TenantNavTabs } from "./TenantNavTabs";

function isNotFoundError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404;
}

function TemplateCard({
  template,
  selected,
  onPick,
  disabled,
}: {
  template: SiteTemplate;
  selected: boolean;
  onPick: () => void;
  disabled: boolean;
}) {
  const primary =
    (template.defaultBranding as Record<string, unknown> | null)?.colors &&
    ((template.defaultBranding as { colors?: { primary?: string } }).colors
      ?.primary ??
      "#ddd");

  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      className={cn(
        "group flex flex-col overflow-hidden rounded-lg border text-left transition-all",
        "hover:border-foreground/50 disabled:cursor-not-allowed disabled:opacity-60",
        selected && "border-foreground ring-2 ring-foreground/20",
      )}
    >
      <div
        className="h-24 w-full"
        style={{ background: typeof primary === "string" ? primary : "#ddd" }}
      />
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-center justify-between">
          <span className="font-medium">{template.name}</span>
          {selected && <CheckCircle2 className="h-4 w-4 text-foreground" />}
        </div>
        {template.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {template.description}
          </p>
        )}
        <Badge variant="secondary" className="mt-auto self-start text-[10px]">
          {template.tier}
        </Badge>
      </div>
    </button>
  );
}

export function TenantWebsitePage() {
  const params = useParams();
  const workspace = String(params.workspace ?? "");
  const tenantId = String(params.id ?? "");
  const { toast } = useToast();

  const { data: tenant } = useTenant(tenantId);
  const siteConfigQuery = useTenantSiteConfig(tenantId);
  const templatesQuery = useSiteTemplates();
  const enableMutation = useEnableTenantWebsite(tenantId);
  const disableMutation = useDisableTenantWebsite(tenantId);

  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  const notEnabled =
    siteConfigQuery.isError && isNotFoundError(siteConfigQuery.error);
  const config = siteConfigQuery.data ?? null;
  const activeTemplateId = config?.templateId ?? null;
  const websiteEnabled = config?.websiteEnabled ?? false;

  const handleEnable = async (templateSlug?: string) => {
    try {
      setPendingSlug(templateSlug ?? "__no_template__");
      await enableMutation.mutateAsync(templateSlug);
      toast({
        title: websiteEnabled ? "Template applied" : "Website enabled",
        description: tenant?.name,
      });
    } catch (error) {
      toast({
        title: "Failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setPendingSlug(null);
    }
  };

  const handleDisable = async () => {
    if (
      !confirm(
        `Disable the website feature for "${tenant?.name}"? Tenant content is preserved but no public traffic will be served.`,
      )
    ) {
      return;
    }
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
            <ArrowLeft className="mr-2 h-4 w-4" />
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
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Globe className="h-5 w-5" />
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
                onClick={() => handleEnable()}
                disabled={enableMutation.isPending}
              >
                {enableMutation.isPending && !pendingSlug?.includes("__no_")
                  ? "Enabling…"
                  : "Enable website"}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleDisable}
                disabled={disableMutation.isPending}
              >
                <PowerOff className="mr-2 h-4 w-4" />
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
            <div>
              <span className="text-muted-foreground">Template: </span>
              {config.template ? (
                <Badge variant="secondary">{config.template.name}</Badge>
              ) : (
                <span className="text-xs text-muted-foreground">
                  None picked
                </span>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Template catalog</CardTitle>
          <CardDescription>
            {notEnabled || !websiteEnabled
              ? "Pick a template below to enable the website feature with it pre-applied."
              : "Switch the template applied to this tenant's website. The tenant's own customizations are preserved."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templatesQuery.isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Loading templates…
            </p>
          ) : templatesQuery.data && templatesQuery.data.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {templatesQuery.data.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  selected={activeTemplateId === t.id}
                  onPick={() => handleEnable(t.slug)}
                  disabled={
                    enableMutation.isPending ||
                    (!t.isActive && activeTemplateId !== t.id)
                  }
                />
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No templates available.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
