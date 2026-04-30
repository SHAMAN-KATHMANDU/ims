"use client";

/**
 * Tenant website settings -- tabbed layout.
 *
 * The page is organized as a header card (status + primary actions) and a
 * horizontal tab strip. Each tab owns a single responsibility:
 *
 *   Overview   -- at-a-glance stats, setup checklist, quick links
 *   Branding   -- colors/typography/logo + template picker
 *   Navigation -- header menu editor
 *   Contact    -- email/phone/address used in the footer
 *   SEO        -- metadata defaults
 *   Advanced   -- legacy section toggles (kept for tenants still on the
 *                pickTemplate rendering path)
 *
 * The Design editor intentionally lives on its own route (site/design)
 * because it's a full-screen three-pane experience. The Overview tab's
 * hero CTA and the page header both deep-link to it.
 */

import { useState } from "react";
import axios from "axios";
import { usePathname } from "next/navigation";
import {
  Globe,
  Lock,
  CheckCircle2,
  XCircle,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { Can, PermissionGate } from "@/features/permissions";
import { useToast } from "@/hooks/useToast";
import {
  useSiteConfig,
  usePublishSite,
  useUnpublishSite,
} from "../hooks/use-tenant-site";
import { SiteBrandingForm } from "./SiteBrandingForm";
import { SiteSeoForm } from "./SiteSeoForm";
import { SiteSectionsPanel } from "./SiteSectionsPanel";
import { SiteTemplatePicker } from "./SiteTemplatePicker";
import { NavMenuPanel } from "./NavMenuPanel";
import { SiteOverviewTab } from "./SiteOverviewTab";
import { ThemeTokensForm } from "./ThemeTokensForm";
import { SiteAnalyticsForm } from "./SiteAnalyticsForm";

function isForbiddenError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 403;
}

function FeatureDisabledCard() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Lock className="h-5 w-5" aria-hidden="true" />
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

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "branding", label: "Branding" },
  { value: "theme", label: "Theme" },
  { value: "navigation", label: "Navigation" },
  { value: "seo", label: "SEO" },
  { value: "analytics", label: "Analytics" },
  { value: "advanced", label: "Advanced" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

export function TenantSitePage() {
  const { toast } = useToast();
  const pathname = usePathname();
  const workspaceSlug = pathname.split("/")[1] ?? "";
  const configQuery = useSiteConfig();
  const publishMutation = usePublishSite();
  const unpublishMutation = useUnpublishSite();

  const [activeTab, setActiveTab] = useState<TabValue>("overview");
  const [unpublishDialogOpen, setUnpublishDialogOpen] = useState(false);

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

  const handleUnpublish = () => {
    setUnpublishDialogOpen(true);
  };

  const confirmUnpublish = async () => {
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

  // ---- Loading / empty / disabled states ------------------------------------

  if (configQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeading />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (disabled) {
    return (
      <div className="space-y-6">
        <PageHeading />
        <FeatureDisabledCard />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="space-y-6">
        <PageHeading />
        <p className="text-sm text-muted-foreground">
          Unable to load site config.
        </p>
      </div>
    );
  }

  const canPublish = !!config.templateId;

  // ---- Main ---------------------------------------------------------------

  return (
    <PermissionGate perm="WEBSITE.SITE.VIEW">
      <div className="space-y-6">
        <PageHeading />

        {/* Status + primary actions */}
        <Card>
          <CardHeader className="flex flex-col gap-4 pb-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted">
                <Globe className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="leading-tight">
                    {config.isPublished ? "Your site is live" : "Draft mode"}
                  </CardTitle>
                  <Badge variant={config.isPublished ? "default" : "secondary"}>
                    {config.isPublished ? "Published" : "Draft"}
                  </Badge>
                  {config.template && (
                    <Badge variant="outline" className="font-normal">
                      {config.template.name}
                    </Badge>
                  )}
                </div>
                <CardDescription className="mt-1.5">
                  {config.isPublished
                    ? "Changes you save will go live within a few seconds."
                    : canPublish
                      ? "Ready to publish -- review your settings and hit Publish when ready."
                      : "Pick a template in the Branding tab before publishing."}
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Can perm="WEBSITE.SITE.UPDATE">
                <Button asChild>
                  <a
                    href={`/${workspaceSlug}/site-editor`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Sparkles className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Open design editor
                    <ExternalLink
                      className="ml-1.5 h-3 w-3"
                      aria-hidden="true"
                    />
                  </a>
                </Button>
              </Can>
              <Can perm="WEBSITE.SITE.DEPLOY">
                {config.isPublished ? (
                  <Button
                    variant="outline"
                    onClick={handleUnpublish}
                    disabled={unpublishMutation.isPending}
                  >
                    <XCircle className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    {unpublishMutation.isPending
                      ? "Unpublishing..."
                      : "Unpublish"}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handlePublish}
                    disabled={!canPublish || publishMutation.isPending}
                  >
                    <CheckCircle2
                      className="mr-1.5 h-4 w-4"
                      aria-hidden="true"
                    />
                    {publishMutation.isPending ? "Publishing..." : "Publish"}
                  </Button>
                )}
              </Can>
            </div>
          </CardHeader>
        </Card>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabValue)}
          className="gap-4"
        >
          <div className="overflow-x-auto">
            <TabsList className="h-auto">
              {TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="overview">
            <SiteOverviewTab
              config={config}
              onGoToTab={(tab) => setActiveTab(tab as TabValue)}
            />
          </TabsContent>

          <TabsContent value="branding" className="space-y-6">
            <SiteTemplatePicker activeTemplateId={config.templateId} />
            <SiteBrandingForm branding={config.branding} />
          </TabsContent>

          <TabsContent value="theme">
            <ThemeTokensForm themeTokens={config.themeTokens} />
          </TabsContent>

          <TabsContent value="navigation">
            <NavMenuPanel />
          </TabsContent>

          <TabsContent value="seo">
            <SiteSeoForm seo={config.seo} />
          </TabsContent>

          <TabsContent value="analytics">
            <SiteAnalyticsForm />
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <LegacySectionsNotice />
            <SiteSectionsPanel features={config.features} />
          </TabsContent>
        </Tabs>

        <AlertDialog
          open={unpublishDialogOpen}
          onOpenChange={setUnpublishDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unpublish your site?</AlertDialogTitle>
              <AlertDialogDescription>
                Visitors will see a &quot;site unavailable&quot; page until you
                republish.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmUnpublish}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Unpublish
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PermissionGate>
  );
}

function PageHeading() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Website</h1>
      <p className="text-sm text-muted-foreground">
        Manage your public storefront -- design, branding, navigation, and
        publishing.
      </p>
    </div>
  );
}

function LegacySectionsNotice() {
  return (
    <Card className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
      <CardHeader className="flex flex-row items-start gap-3 pb-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <CardTitle className="text-base">Legacy section toggles</CardTitle>
          <CardDescription className="text-amber-800 dark:text-amber-200/80">
            These switches only affect tenants still rendering via the
            template-based path. Once you build a home layout in the design
            editor, the block tree takes over and these toggles become a no-op.
            Leave them as-is unless you&apos;re rolling back.
          </CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}
