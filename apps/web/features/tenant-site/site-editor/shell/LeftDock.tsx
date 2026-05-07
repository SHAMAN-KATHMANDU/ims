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

interface LeftDockProps {
  defaultTab?: string;
  scope?: SiteLayoutScope;
  theme?: ThemeTokens;
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
      onScopeChange,
      onThemeChange,
    },
    ref,
  ) => {
    const [activeTab, setActiveTab] = useState<TabId>(defaultTab as TabId);

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
          {activeTab === "site" && (
            <div className="p-4 text-sm text-gray-500">
              Site panel (Coming in Phase 3c)
            </div>
          )}
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

        {/* Panel content */}
        <div className="flex-1 min-w-0 flex flex-col">
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
