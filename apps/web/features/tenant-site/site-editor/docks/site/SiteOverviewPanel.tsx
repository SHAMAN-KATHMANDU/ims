"use client";

import { useMemo } from "react";
import {
  Palette,
  Navigation as NavIcon,
  LayoutGrid,
  FileText,
  CheckCircle2,
  Circle,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavMenus } from "../../../hooks/use-nav-menus";
import { useSiteLayouts } from "../../../hooks/use-site-layouts";
import { useTenantPages } from "@/features/tenant-pages";
import { useSiteConfig } from "../../../hooks/use-tenant-site";

interface SiteOverviewPanelProps {
  onSelectPanel: (panelId: string) => void;
}

export function SiteOverviewPanel({ onSelectPanel }: SiteOverviewPanelProps) {
  const siteQuery = useSiteConfig();
  const config = siteQuery.data;
  const navMenusQuery = useNavMenus();
  const layoutsQuery = useSiteLayouts();
  const pagesQuery = useTenantPages({ limit: 100 });

  const headerMenu = useMemo(() => {
    return (navMenusQuery.data ?? []).find((m) => m.slot === "header-primary");
  }, [navMenusQuery.data]);

  const headerItemCount = useMemo(() => {
    if (!headerMenu) return 0;
    const raw = headerMenu.items as { items?: unknown[] } | undefined;
    const items = Array.isArray(raw?.items) ? raw.items : [];
    return items.length;
  }, [headerMenu]);

  const layoutCount = layoutsQuery.data?.length ?? 0;
  const pagesCount = pagesQuery.data?.pages.length ?? 0;

  const brandingConfigured = useMemo(() => {
    return Boolean(config?.branding && Object.keys(config.branding).length > 0);
  }, [config?.branding]);

  const templatePicked = Boolean(config?.templateId);
  const navConfigured = headerItemCount > 0;
  const designConfigured = layoutCount > 0;

  const checklist: ChecklistItem[] = useMemo(
    () => [
      {
        label: "Pick a template",
        done: templatePicked,
        action: () => onSelectPanel("branding"),
        hint: "Choose a starting point for your site's look and feel.",
      },
      {
        label: "Configure branding",
        done: brandingConfigured,
        action: () => onSelectPanel("branding"),
        hint: "Set your logo, colors, name, and tagline.",
      },
      {
        label: "Set up navigation",
        done: navConfigured,
        action: () => onSelectPanel("nav"),
        hint: "Choose what appears in your header menu.",
      },
      {
        label: "Design your pages",
        done: designConfigured,
        action: () => onSelectPanel("design"),
        hint: "Compose your home page and product pages with blocks.",
      },
      {
        label: "Add a domain",
        done: (config?.features as Record<string, unknown> | null)
          ?.primaryDomain
          ? true
          : false,
        action: () => onSelectPanel("domain"),
        hint: "Point a custom domain at your site.",
      },
      {
        label: "Publish your site",
        done: config?.isPublished ?? false,
        action: () => onSelectPanel("overview"),
        hint: "Make it live for the world to see.",
        disabled: !templatePicked,
      },
    ],
    [
      templatePicked,
      brandingConfigured,
      navConfigured,
      designConfigured,
      config,
      onSelectPanel,
    ],
  );

  const completed = checklist.filter((item) => item.done).length;
  const total = checklist.length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="h-11 px-4 flex items-center border-b border-border shrink-0">
        <span className="text-sm font-semibold text-foreground">Overview</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Stat tiles */}
        <div className="grid gap-3 grid-cols-2">
          <StatTile
            icon={<Palette className="h-4 w-4" />}
            label="Template"
            value={config?.template?.name ?? "Not picked"}
            muted={!templatePicked}
            onClick={() => onSelectPanel("branding")}
          />
          <StatTile
            icon={<NavIcon className="h-4 w-4" />}
            label="Nav items"
            value={navMenusQuery.isLoading ? "…" : String(headerItemCount)}
            muted={headerItemCount === 0}
            onClick={() => onSelectPanel("nav")}
          />
          <StatTile
            icon={<LayoutGrid className="h-4 w-4" />}
            label="Layouts"
            value={layoutsQuery.isLoading ? "…" : String(layoutCount)}
            muted={layoutCount === 0}
            onClick={() => onSelectPanel("design")}
          />
          <StatTile
            icon={<FileText className="h-4 w-4" />}
            label="Custom pages"
            value={pagesQuery.isLoading ? "…" : String(pagesCount)}
            muted={pagesCount === 0}
            onClick={() => onSelectPanel("pages")}
          />
        </div>

        {/* Setup checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>Setup checklist</span>
              <span className="text-xs font-normal text-muted-foreground">
                {completed} / {total}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {checklist.map((item) => (
              <ChecklistRow key={item.label} item={item} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface ChecklistItem {
  label: string;
  done: boolean;
  action?: () => void;
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
        <ArrowRight
          className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/60"
          aria-hidden="true"
        />
      )}
    </div>
  );

  return (
    <button
      type="button"
      onClick={item.action}
      disabled={item.disabled}
      className="flex w-full rounded-md border border-transparent p-2 transition hover:border-border hover:bg-muted/40 disabled:opacity-50"
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
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  muted?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      variant="ghost"
      className="block w-full justify-start h-auto p-4 gap-0"
      size="sm"
    >
      <div className="flex h-full flex-col gap-2 rounded-lg border border-border bg-card p-4 text-left transition hover:border-primary/50 w-full">
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
    </Button>
  );
}
