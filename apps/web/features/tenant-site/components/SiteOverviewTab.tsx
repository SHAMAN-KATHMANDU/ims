"use client";

/**
 * Overview tab — at-a-glance status for the tenant's website.
 *
 * Summarizes the five things a tenant cares about before they dive into
 * sub-tabs: publication state, template, branding, navigation, and page
 * composition. Each tile links to the relevant tab so this doubles as a
 * launchpad.
 *
 * Computing the tiles pulls from several existing queries; we tolerate
 * partial loads (each stat shows a muted "—" until its data arrives)
 * instead of blocking the whole overview on the slowest fetch.
 */

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  FileText,
  LayoutGrid,
  Navigation as NavIcon,
  Palette,
  Sparkles,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavMenus } from "../hooks/use-nav-menus";
import { useSiteLayouts } from "../hooks/use-site-layouts";
import { useTenantPages } from "@/features/tenant-pages/hooks/use-tenant-pages";
import type { SiteConfig } from "../hooks/use-tenant-site";

interface SiteOverviewTabProps {
  config: SiteConfig;
  onGoToTab: (tab: string) => void;
}

export function SiteOverviewTab({ config, onGoToTab }: SiteOverviewTabProps) {
  const navMenusQuery = useNavMenus();
  const layoutsQuery = useSiteLayouts();
  const pagesQuery = useTenantPages({ limit: 100 });

  // Nav item count for the header-primary slot. The items payload can be
  // a full NavConfig OR a NavItemsOnly — grab the array either way.
  const headerMenu = (navMenusQuery.data ?? []).find(
    (m) => m.slot === "header-primary",
  );
  const headerItemCount = (() => {
    if (!headerMenu) return 0;
    const raw = headerMenu.items as { items?: unknown[] } | undefined;
    const items = Array.isArray(raw?.items) ? raw.items : [];
    return items.length;
  })();

  const layoutCount = layoutsQuery.data?.length ?? 0;
  const pagesCount = pagesQuery.data?.pages.length ?? 0;

  const brandingConfigured = Boolean(
    config.branding && Object.keys(config.branding).length > 0,
  );
  const contactConfigured = Boolean(
    config.contact && Object.keys(config.contact).length > 0,
  );
  const templatePicked = Boolean(config.templateId);
  const navConfigured = headerItemCount > 0;
  const designConfigured = layoutCount > 0;

  const checklist: ChecklistItem[] = [
    {
      label: "Pick a template",
      done: templatePicked,
      action: () => onGoToTab("branding"),
      hint: "Choose a starting point for your site's look and feel.",
    },
    {
      label: "Configure branding",
      done: brandingConfigured,
      action: () => onGoToTab("branding"),
      hint: "Set your colors, fonts, logo, and typography.",
    },
    {
      label: "Set up navigation",
      done: navConfigured,
      action: () => onGoToTab("navigation"),
      hint: "Choose what appears in your header menu.",
    },
    {
      label: "Design your pages",
      done: designConfigured,
      href: "site/design",
      hint: "Compose your home page and product pages with blocks.",
    },
    {
      label: "Add contact info",
      done: contactConfigured,
      action: () => onGoToTab("contact"),
      hint: "Email, phone, and address for your footer.",
    },
    {
      label: "Publish your site",
      done: config.isPublished,
      action: () => onGoToTab("overview"),
      hint: "Make it live for the world to see.",
      disabled: !templatePicked,
    },
  ];

  const completed = checklist.filter((item) => item.done).length;
  const total = checklist.length;

  return (
    <div className="space-y-6">
      {/* Brand preview */}
      <BrandPreviewCard config={config} />

      {/* Stat tiles */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={<Palette className="h-4 w-4" />}
          label="Template"
          value={config.template?.name ?? "Not picked"}
          muted={!templatePicked}
          onClick={() => onGoToTab("branding")}
        />
        <StatTile
          icon={<NavIcon className="h-4 w-4" />}
          label="Nav items"
          value={navMenusQuery.isLoading ? "…" : String(headerItemCount)}
          muted={headerItemCount === 0}
          onClick={() => onGoToTab("navigation")}
        />
        <StatTile
          icon={<LayoutGrid className="h-4 w-4" />}
          label="Layouts"
          value={layoutsQuery.isLoading ? "…" : String(layoutCount)}
          muted={layoutCount === 0}
          href="site/design"
        />
        <StatTile
          icon={<FileText className="h-4 w-4" />}
          label="Custom pages"
          value={pagesQuery.isLoading ? "…" : String(pagesCount)}
          muted={pagesCount === 0}
          href="site/pages"
        />
      </div>

      {/* Hero CTA */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col items-start gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold">Design your site with blocks</div>
              <p className="text-sm text-muted-foreground">
                Drag blocks into home, products, and product-detail pages. Save
                drafts, publish when ready.
              </p>
            </div>
          </div>
          <Button asChild>
            <Link href="site/design">
              Open design editor
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Setup checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Setup checklist</span>
            <span className="text-sm font-normal text-muted-foreground">
              {completed} / {total}
            </span>
          </CardTitle>
          <CardDescription>
            Work through the list to get your website launch-ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {checklist.map((item) => (
            <ChecklistRow key={item.label} item={item} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function BrandPreviewCard({ config }: { config: SiteConfig }) {
  const branding = (config.branding ?? {}) as {
    name?: string;
    tagline?: string;
    logoUrl?: string;
    colors?: {
      primary?: string;
      accent?: string;
      background?: string;
      surface?: string;
      text?: string;
    };
  };
  const name = branding.name ?? "Your site";
  const tagline = branding.tagline ?? "";
  const colors = branding.colors ?? {};
  const swatches: { key: string; label: string; value?: string }[] = [
    { key: "primary", label: "Primary", value: colors.primary },
    { key: "accent", label: "Accent", value: colors.accent },
    { key: "background", label: "Background", value: colors.background },
    { key: "surface", label: "Surface", value: colors.surface },
    { key: "text", label: "Text", value: colors.text },
  ].filter((s) => s.value);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Brand preview</CardTitle>
        <CardDescription>
          A quick snapshot of what visitors see on your site.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logoUrl}
                alt={name}
                className="h-10 w-10 rounded-md border border-border object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted text-sm font-semibold text-muted-foreground">
                {name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-base font-semibold">{name}</div>
              {tagline && (
                <div className="truncate text-xs text-muted-foreground">
                  {tagline}
                </div>
              )}
            </div>
          </div>
          {swatches.length > 0 ? (
            <div className="flex items-center gap-3">
              {swatches.map((s) => (
                <div key={s.key} className="flex flex-col items-center gap-1">
                  <div
                    className="h-6 w-6 rounded-full border border-border shadow-sm"
                    style={{ background: s.value }}
                    title={`${s.label}: ${s.value}`}
                  />
                  <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">
              No custom colors yet
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ChecklistItem {
  label: string;
  done: boolean;
  action?: () => void;
  href?: string;
  hint: string;
  disabled?: boolean;
}

function ChecklistRow({ item }: { item: ChecklistItem }) {
  const Icon = item.done ? CheckCircle2 : Circle;
  const content = (
    <div className="flex flex-1 items-start gap-3 text-left">
      <Icon
        className={`mt-0.5 h-4 w-4 shrink-0 ${
          item.done ? "text-green-600" : "text-muted-foreground/60"
        }`}
      />
      <div className="min-w-0 flex-1">
        <div
          className={`text-sm font-medium ${
            item.done ? "text-foreground/80" : "text-foreground"
          }`}
        >
          {item.label}
        </div>
        <div className="text-xs text-muted-foreground">{item.hint}</div>
      </div>
      {!item.done && !item.disabled && (
        <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
      )}
    </div>
  );

  const className =
    "flex w-full rounded-md border border-transparent p-2 transition hover:border-border hover:bg-muted/40 disabled:opacity-50";

  if (item.href) {
    return (
      <Link href={item.href} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={item.action}
      disabled={item.disabled}
      className={className}
    >
      {content}
    </button>
  );
}

function StatTile({
  icon,
  label,
  value,
  muted,
  onClick,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  muted?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const content = (
    <div className="flex h-full flex-col gap-2 rounded-lg border border-border bg-card p-4 text-left transition hover:border-primary/50">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={`truncate text-lg font-semibold ${
          muted ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className="block w-full">
      {content}
    </button>
  );
}
