"use client";

/**
 * SitePanels — thin layout shells that wrap the shared site-config form
 * components (SiteOverviewTab, SiteBrandingForm, etc.).
 *
 * Each component is a pure presentational shell: header + scrollable body.
 * No store access, no mutations — everything is delegated to the inner form.
 */

import { Plus, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteOverviewTab } from "../components/SiteOverviewTab";
import { SiteBrandingForm } from "../components/SiteBrandingForm";
import { SiteTemplatePicker } from "../components/SiteTemplatePicker";
import { ThemeTokensForm } from "../components/ThemeTokensForm";
import { NavMenuPanel } from "../components/NavMenuPanel";
import { SiteSeoForm } from "../components/SiteSeoForm";
import { Info } from "lucide-react";
import type { SiteConfig } from "../hooks/use-tenant-site";
import type { PanelId } from "./types";

// Shared panel header/scroll layout
function PanelShell({
  title,
  children,
  className = "p-4",
  headerSlot,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  headerSlot?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="h-11 px-3 flex items-center border-b border-border shrink-0">
        <span className="text-[13px] font-semibold text-foreground flex-1">
          {title}
        </span>
        {headerSlot}
      </div>
      <div className={`flex-1 overflow-y-auto ${className}`}>{children}</div>
    </div>
  );
}

export function OverviewPanel({
  config,
  onGoToPanel,
}: {
  config: SiteConfig;
  onGoToPanel: (p: PanelId) => void;
}) {
  return (
    <PanelShell title="Overview">
      <SiteOverviewTab
        config={config}
        onGoToTab={(tab) => onGoToPanel(tab as PanelId)}
      />
    </PanelShell>
  );
}

export function BrandingPanel({ config }: { config: SiteConfig }) {
  return (
    <PanelShell title="Branding" className="p-4 space-y-4">
      <SiteTemplatePicker activeTemplateId={config.templateId} />
      <SiteBrandingForm branding={config.branding} />
    </PanelShell>
  );
}

export function ThemePanel({ config }: { config: SiteConfig }) {
  return (
    <PanelShell title="Theme" className="">
      <ThemeTokensForm themeTokens={config.themeTokens} />
    </PanelShell>
  );
}

export function NavPanel() {
  return (
    <PanelShell title="Navigation" className="">
      <NavMenuPanel />
    </PanelShell>
  );
}

export function SEOPanel({ config }: { config: SiteConfig }) {
  return (
    <PanelShell title="SEO">
      <SiteSeoForm seo={config.seo} />
    </PanelShell>
  );
}

export function ContactPanel() {
  return (
    <PanelShell title="Contact" className="p-4">
      <div className="flex gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>
          Contact details (email, phone, address, socials) live on your{" "}
          <a
            href="../settings/business-profile"
            className="font-medium underline underline-offset-2"
          >
            business profile
          </a>
          . Edits there appear on your site automatically.
        </p>
      </div>
    </PanelShell>
  );
}

export function MediaPanel() {
  return (
    <PanelShell
      title="Media"
      className="p-4"
      headerSlot={
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground/60 hover:text-foreground/80"
          aria-label="Add media"
        >
          <Plus size={14} />
        </Button>
      }
    >
      <div className="flex flex-col items-center justify-center gap-2 h-32 rounded-lg border-2 border-dashed border-border text-[12px] text-muted-foreground/60 hover:border-primary/30 hover:bg-accent/20 cursor-pointer transition-colors">
        <Image size={20} className="opacity-40" />
        <span>Drop files or click to upload</span>
      </div>
    </PanelShell>
  );
}
