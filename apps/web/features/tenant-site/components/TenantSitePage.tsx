"use client";

import axios from "axios";
import { Globe, Lock, CheckCircle2, XCircle } from "lucide-react";
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
import {
  useSiteConfig,
  usePublishSite,
  useUnpublishSite,
} from "../hooks/use-tenant-site";
import { SiteBrandingForm } from "./SiteBrandingForm";
import { SiteContactForm } from "./SiteContactForm";
import { SiteSeoForm } from "./SiteSeoForm";
import { SiteSectionsPanel } from "./SiteSectionsPanel";
import { SiteTemplatePicker } from "./SiteTemplatePicker";

function isForbiddenError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 403;
}

function FeatureDisabledCard() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Lock className="h-5 w-5" />
        </div>
        <div>
          <CardTitle>Website feature not enabled</CardTitle>
          <CardDescription>
            Your platform administrator hasn&apos;t turned on the website
            feature for this workspace yet. Contact them to get started.
          </CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}

export function TenantSitePage() {
  const { toast } = useToast();
  const configQuery = useSiteConfig();
  const publishMutation = usePublishSite();
  const unpublishMutation = useUnpublishSite();

  const config = configQuery.data;
  const disabled = configQuery.isError && isForbiddenError(configQuery.error);

  const handlePublish = async () => {
    try {
      await publishMutation.mutateAsync();
      toast({ title: "Site published" });
    } catch (error) {
      toast({
        title: "Publish failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleUnpublish = async () => {
    if (
      !confirm(
        "Unpublish your site? Visitors will see a “site unavailable” page until you republish.",
      )
    ) {
      return;
    }
    try {
      await unpublishMutation.mutateAsync();
      toast({ title: "Site unpublished" });
    } catch (error) {
      toast({
        title: "Unpublish failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  if (configQuery.isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Website</h1>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (disabled) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Website</h1>
          <p className="text-sm text-muted-foreground">
            Manage your public storefront.
          </p>
        </div>
        <FeatureDisabledCard />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Website</h1>
        <p className="text-sm text-muted-foreground">
          Unable to load site config.
        </p>
      </div>
    );
  }

  const canPublish = !!config.templateId;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Website</h1>
        <p className="text-sm text-muted-foreground">
          Manage your public storefront branding, content, and publishing.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Publication</CardTitle>
              <CardDescription>
                {config.isPublished
                  ? "Your site is live."
                  : canPublish
                    ? "Ready to publish — your template is picked."
                    : "Pick a template below before publishing."}
              </CardDescription>
            </div>
          </div>
          <div>
            {config.isPublished ? (
              <Button
                variant="outline"
                onClick={handleUnpublish}
                disabled={unpublishMutation.isPending}
              >
                <XCircle className="mr-2 h-4 w-4" />
                {unpublishMutation.isPending ? "Unpublishing…" : "Unpublish"}
              </Button>
            ) : (
              <Button
                onClick={handlePublish}
                disabled={!canPublish || publishMutation.isPending}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {publishMutation.isPending ? "Publishing…" : "Publish site"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Status: </span>
            <Badge variant={config.isPublished ? "default" : "secondary"}>
              {config.isPublished ? "Published" : "Draft"}
            </Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Template: </span>
            {config.template ? (
              <Badge variant="secondary">{config.template.name}</Badge>
            ) : (
              <span className="text-xs text-muted-foreground">None picked</span>
            )}
          </div>
        </CardContent>
      </Card>

      <SiteTemplatePicker activeTemplateId={config.templateId} />

      <SiteBrandingForm branding={config.branding} />
      <SiteSectionsPanel features={config.features} />
      <SiteContactForm contact={config.contact} />
      <SiteSeoForm seo={config.seo} />
    </div>
  );
}
