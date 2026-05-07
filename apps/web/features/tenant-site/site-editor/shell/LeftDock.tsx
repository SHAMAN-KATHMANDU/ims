/**
 * Left dock: tabbed panel with icon rail.
 * Panels: Pages, Blocks, Theme, Tree, Templates, Nav, Footer, Collections, Media, Site.
 */

import React, { Suspense, useState } from "react";
import {
  FileText,
  Layers,
  Palette,
  GitBranch,
  Wand2,
  Menu,
  MapPin,
  Grid3X3,
  Image,
  Settings,
} from "lucide-react";
import type { SiteLayoutScope, ThemeTokens } from "@repo/shared";
import { PagesPanel } from "../docks/pages/PagesPanel";
import { BlocksPanel } from "../docks/blocks/BlocksPanel";
import { ThemePanel } from "../docks/theme/ThemePanel";
import { TreePanel } from "../docks/tree/TreePanel";
import { TemplatesPanel } from "../docks/templates/TemplatesPanel";
import { NavMenuPanel } from "../docks/nav/NavMenuPanel";
import { FooterPanel } from "../docks/footer/FooterPanel";
import { CollectionsPanel } from "../docks/collections/CollectionsPanel";
import { MediaLibraryPanel } from "../docks/media/MediaLibraryPanel";
import {
  SiteOverviewPanel,
  BrandingPanel,
  DomainPanel,
  RedirectsPanel,
  SeoPanel,
  AnalyticsPanel,
  SectionsPanel,
  ContactPanel,
  PublishHistoryPanel,
  DangerZonePanel,
} from "../docks/site";

type SitePanelId =
  | "overview"
  | "branding"
  | "domain"
  | "redirects"
  | "seo"
  | "analytics"
  | "sections"
  | "contact"
  | "publish-history"
  | "danger";

const SITE_PANELS: { id: SitePanelId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "branding", label: "Branding" },
  { id: "domain", label: "Domain" },
  { id: "redirects", label: "Redirects" },
  { id: "seo", label: "SEO" },
  { id: "analytics", label: "Analytics" },
  { id: "sections", label: "Sections" },
  { id: "contact", label: "Contact" },
  { id: "publish-history", label: "Publish history" },
  { id: "danger", label: "Danger zone" },
];

interface LeftDockProps {
  defaultTab?: string;
  scope?: SiteLayoutScope;
  theme?: ThemeTokens;
  workspace: string;
  onScopeChange?: (scope: SiteLayoutScope) => void;
  onThemeChange?: (theme: ThemeTokens) => void;
}

type TabId =
  | "pages"
  | "blocks"
  | "theme"
  | "tree"
  | "templates"
  | "nav"
  | "footer"
  | "collections"
  | "media"
  | "site";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: "pages", label: "Pages", icon: <FileText className="w-5 h-5" /> },
  { id: "blocks", label: "Blocks", icon: <Layers className="w-5 h-5" /> },
  { id: "theme", label: "Theme", icon: <Palette className="w-5 h-5" /> },
  { id: "tree", label: "Tree", icon: <GitBranch className="w-5 h-5" /> },
  { id: "templates", label: "Templates", icon: <Wand2 className="w-5 h-5" /> },
  { id: "nav", label: "Nav", icon: <Menu className="w-5 h-5" /> },
  { id: "footer", label: "Footer", icon: <MapPin className="w-5 h-5" /> },
  {
    id: "collections",
    label: "Collections",
    icon: <Grid3X3 className="w-5 h-5" />,
  },
  { id: "media", label: "Media", icon: <Image className="w-5 h-5" /> },
  { id: "site", label: "Site", icon: <Settings className="w-5 h-5" /> },
];

export const LeftDock = React.forwardRef<HTMLDivElement, LeftDockProps>(
  (
    {
      defaultTab = "pages",
      scope = "home",
      theme,
      workspace,
      onScopeChange,
      onThemeChange,
    },
    ref,
  ) => {
    const [activeTab, setActiveTab] = useState<TabId>(defaultTab as TabId);
    const [activeSitePanel, setActiveSitePanel] =
      useState<SitePanelId>("overview");

    // Overview's checklist can ask to switch to a TOP-LEVEL tab (nav, footer,
    // media, design, pages) or to a sibling SITE sub-panel (branding, domain,
    // …). Route accordingly.
    const handleOverviewSelect = (id: string): void => {
      switch (id) {
        case "nav":
        case "footer":
        case "media":
        case "pages":
          setActiveTab(id as TabId);
          return;
        case "design":
          // No "design" top tab — Tree is the closest equivalent.
          setActiveTab("tree" as TabId);
          return;
        case "overview":
        case "branding":
        case "domain":
        case "redirects":
        case "seo":
        case "analytics":
        case "sections":
        case "contact":
        case "publish-history":
        case "danger":
          setActiveSitePanel(id as SitePanelId);
          return;
        default:
          // Unknown ids: silently no-op rather than crashing the dock.
          return;
      }
    };

    const renderSiteDock = () => (
      <div className="flex h-full">
        <nav className="w-44 shrink-0 border-r border-gray-200 overflow-y-auto py-2">
          {SITE_PANELS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActiveSitePanel(p.id)}
              className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                activeSitePanel === p.id
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </nav>
        <div className="flex-1 min-w-0 overflow-y-auto">
          {activeSitePanel === "overview" && (
            <SiteOverviewPanel onSelectPanel={handleOverviewSelect} />
          )}
          {activeSitePanel === "branding" && <BrandingPanel />}
          {activeSitePanel === "domain" && <DomainPanel />}
          {activeSitePanel === "redirects" && <RedirectsPanel />}
          {activeSitePanel === "seo" && <SeoPanel />}
          {activeSitePanel === "analytics" && <AnalyticsPanel />}
          {activeSitePanel === "sections" && <SectionsPanel />}
          {activeSitePanel === "contact" && <ContactPanel />}
          {activeSitePanel === "publish-history" && <PublishHistoryPanel />}
          {activeSitePanel === "danger" && <DangerZonePanel />}
        </div>
      </div>
    );

    const renderPanel = () => {
      const label = TABS.find((t) => t.id === activeTab)?.label ?? "";
      return (
        <Suspense
          fallback={
            <div className="p-4 text-sm text-gray-500">Loading {label}...</div>
          }
        >
          {activeTab === "pages" && (
            <PagesPanel
              currentScope={scope}
              onScopeChange={onScopeChange || (() => {})}
              workspace={workspace}
            />
          )}
          {activeTab === "blocks" && <BlocksPanel />}
          {activeTab === "theme" && theme && (
            <ThemePanel theme={theme} onThemeChange={onThemeChange} />
          )}
          {activeTab === "tree" && <TreePanel />}
          {activeTab === "templates" && <TemplatesPanel />}
          {activeTab === "nav" && <NavMenuPanel />}
          {activeTab === "footer" && <FooterPanel />}
          {activeTab === "collections" && <CollectionsPanel />}
          {activeTab === "media" && <MediaLibraryPanel />}
          {activeTab === "site" && renderSiteDock()}
        </Suspense>
      );
    };

    return (
      <div ref={ref} className="h-full flex bg-white border-r border-gray-200">
        {/* Icon rail */}
        <div className="w-16 border-r border-gray-200 flex flex-col items-center py-4 gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative p-3 rounded-lg transition-colors group ${
                activeTab === tab.id
                  ? "bg-blue-100 text-blue-600"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              title={tab.label}
            >
              {tab.icon}
              <div className="absolute left-20 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                {tab.label}
              </div>
            </button>
          ))}
        </div>

        {/* Panel content — Site dock needs more room (sub-rail + panel); other tabs use 320 px. */}
        <div
          className={`shrink-0 flex flex-col ${
            activeTab === "site" ? "w-[480px]" : "w-80"
          }`}
        >
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h2>
          </div>
          <div className="flex-1 overflow-hidden">{renderPanel()}</div>
        </div>
      </div>
    );
  },
);

LeftDock.displayName = "LeftDock";
