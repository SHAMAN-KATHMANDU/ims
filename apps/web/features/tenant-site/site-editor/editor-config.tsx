"use client";

/**
 * editor-config — static UI constants for SiteEditorPage.
 *
 * Extracted here so SiteEditorPage, EditorTopBar, and EmptyCanvas
 * can import them without creating circular or multi-hop chains.
 */

import {
  Monitor,
  Tablet,
  Smartphone,
  LayoutGrid,
  Layers,
  Image,
  LayoutDashboard,
  Palette,
  Sliders,
  Navigation,
  Search,
  Mail,
  Link2,
  FileText,
} from "lucide-react";
import type { PanelId } from "./types";

// ---------------------------------------------------------------------------
// Accent colour (shared by top-bar + rail publish buttons)
// ---------------------------------------------------------------------------

export const ACCENT = "oklch(0.62 0.08 150)";

// ---------------------------------------------------------------------------
// Device viewport definitions
// ---------------------------------------------------------------------------

export const DEVICES = {
  desktop: { w: 1280, label: "Desktop", icon: Monitor },
  tablet: { w: 834, label: "Tablet", icon: Tablet },
  mobile: { w: 390, label: "Mobile", icon: Smartphone },
} as const;

export type DeviceKey = keyof typeof DEVICES;

// ---------------------------------------------------------------------------
// Wide-panel list (determines panel sidebar width)
// ---------------------------------------------------------------------------

export const WIDE_PANELS: PanelId[] = [
  "overview",
  "branding",
  "theme",
  "nav",
  "seo",
  "contact",
  "domain",
];

// ---------------------------------------------------------------------------
// Icon rail items
// ---------------------------------------------------------------------------

export const RAIL: {
  id: PanelId;
  label: string;
  kbd: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  dividerBefore?: boolean;
}[] = [
  {
    id: "pages",
    label: "Pages",
    kbd: "1",
    Icon: ({ size, ...p }) => (
      <svg
        width={size ?? 18}
        height={size ?? 18}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        {...p}
      >
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
  { id: "blocks", label: "Add blocks", kbd: "2", Icon: LayoutGrid },
  { id: "layers", label: "Layers", kbd: "3", Icon: Layers },
  { id: "media", label: "Media", kbd: "4", Icon: Image },
  {
    id: "overview",
    label: "Overview",
    kbd: "5",
    Icon: LayoutDashboard,
    dividerBefore: true,
  },
  { id: "branding", label: "Branding", kbd: "6", Icon: Palette },
  { id: "theme", label: "Theme", kbd: "7", Icon: Sliders },
  { id: "nav", label: "Navigation", kbd: "8", Icon: Navigation },
  { id: "seo", label: "SEO", kbd: "9", Icon: Search },
  { id: "contact", label: "Contact", kbd: "0", Icon: Mail },
  { id: "domain", label: "Domains", kbd: "-", Icon: Link2 },
  { id: "blog", label: "Blog", kbd: "=", Icon: FileText },
];
