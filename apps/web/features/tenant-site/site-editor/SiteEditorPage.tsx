"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Monitor,
  Tablet,
  Smartphone,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Eye,
  Rocket,
  Search,
  Keyboard,
  Plus,
  X,
  Layers,
  LayoutGrid,
  Palette,
  Navigation,
  Image,
  FileText,
  Globe,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Copy,
  Trash2,
  EyeOff,
  Box,
  Hash,
  GripVertical,
  LayoutDashboard,
  Sliders,
  Mail,
  Link2,
  Clock,
  CheckCircle2,
  ArrowLeft,
  Pencil,
  MoreHorizontal,
  AlignLeft,
  MousePointerClick,
  Sparkles,
  Megaphone,
  ShieldCheck,
  Columns2,
  Columns3,
  BarChart3,
  HelpCircle,
  Quote,
  Images,
  ShoppingCart,
  Info,
  ChevronsRight,
  Code2,
  Play,
  ListTree,
  PanelTopOpen,
  ClipboardList,
  Code,
  Package,
  Gift,
  Star,
  ShoppingBag,
  Ruler,
  FileCheck,
  Menu,
  Tag,
  Share2,
  CreditCard,
  Copyright,
  CircleSlash,
  History,
  Heading,
  Contact as ContactIcon,
  Rows3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import type {
  BlockNode,
  BlockStyleOverride,
  SiteLayoutScope,
} from "@repo/shared";
import {
  useSiteLayout,
  useUpsertSiteLayoutDraft,
  usePublishSiteLayout,
  useSiteLayoutPreviewUrl,
  useResetSiteLayoutFromTemplate,
} from "../hooks/use-site-layouts";
import { useSiteConfig, type SiteConfig } from "../hooks/use-tenant-site";
import { SiteOverviewTab } from "../components/SiteOverviewTab";
import { SiteBrandingForm } from "../components/SiteBrandingForm";
import { SiteTemplatePicker } from "../components/SiteTemplatePicker";
import { ThemeTokensForm } from "../components/ThemeTokensForm";
import { NavMenuPanel } from "../components/NavMenuPanel";
import { SiteSeoForm } from "../components/SiteSeoForm";
import { SiteContactForm } from "../components/SiteContactForm";
import { AddDomainDialog } from "../../sites/components/AddDomainDialog";
import { VerifyDomainDialog } from "../../sites/components/VerifyDomainDialog";
import {
  useTenantDomains,
  useDeleteTenantDomain,
  type TenantDomain,
} from "../../sites/hooks/use-tenant-domains";
import {
  useBlogPosts,
  useBlogPost,
  useDeleteBlogPost,
} from "@/features/tenant-blog/hooks/use-tenant-blog";
import type {
  BlogPost,
  BlogPostListItem,
  BlogPostStatus,
} from "@/features/tenant-blog/services/tenant-blog.service";
import { BlogPostEditor } from "@/features/tenant-blog/components/BlogPostEditor";
import { BlogStatusBadge } from "@/features/tenant-blog/components/BlogStatusBadge";
import {
  useTenantPages,
  useTenantPage,
} from "@/features/tenant-pages/hooks/use-tenant-pages";
import type { TenantPage as TenantPageModel } from "@/features/tenant-pages/services/tenant-pages.service";
import { TenantPageEditor } from "@/features/tenant-pages/components/TenantPageEditor";
import { useProductsPaginated } from "@/features/products/hooks/use-products";
import {
  useEditorStore,
  selectBlocks,
  selectDirty,
  selectSelectedId,
} from "./editor-store";
import { BlockInspector } from "./BlockInspector";
import { PreviewFrame } from "./PreviewFrame";
import { BLOCK_CATALOG } from "./block-catalog";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEVICES = {
  desktop: { w: 1280, label: "Desktop", icon: Monitor },
  tablet: { w: 834, label: "Tablet", icon: Tablet },
  mobile: { w: 390, label: "Mobile", icon: Smartphone },
} as const;

type DeviceKey = keyof typeof DEVICES;

const BUILT_IN_SCOPES: { value: SiteLayoutScope; label: string }[] = [
  { value: "home", label: "Home" },
  { value: "products-index", label: "Products" },
  { value: "product-detail", label: "Product detail" },
  { value: "offers", label: "Offers" },
  { value: "blog-index", label: "Blog index" },
  { value: "blog-post", label: "Blog post" },
  { value: "contact", label: "Contact" },
  { value: "404", label: "404 page" },
  { value: "landing", label: "Landing page" },
];

type PanelId =
  | "pages"
  | "blocks"
  | "layers"
  | "media"
  | "overview"
  | "branding"
  | "theme"
  | "nav"
  | "seo"
  | "contact"
  | "domain"
  | "blog";

const RAIL: {
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

const BLOCK_GROUPS = [
  "All",
  "Layout",
  "Content",
  "Commerce",
  "Marketing",
  "Blog",
  "PDP",
  "Form",
  "Header",
  "Footer",
];

/** Map block kinds to meaningful icons so the palette is scannable. */
const BLOCK_ICON: Record<
  string,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  section: Rows3,
  spacer: Rows3,
  divider: Rows3,
  heading: Heading,
  "rich-text": AlignLeft,
  image: Image,
  button: MousePointerClick,
  "markdown-body": FileText,
  hero: Sparkles,
  "product-grid": LayoutGrid,
  "category-tiles": LayoutGrid,
  "product-listing": LayoutGrid,
  "product-filters": Sliders,
  "collection-cards": LayoutGrid,
  "announcement-bar": Megaphone,
  "trust-strip": ShieldCheck,
  "story-split": Columns2,
  "bento-showcase": LayoutDashboard,
  "stats-band": BarChart3,
  newsletter: Mail,
  "contact-block": ContactIcon,
  faq: HelpCircle,
  testimonials: Quote,
  "logo-cloud": Box,
  "blog-list": FileText,
  "pdp-gallery": Images,
  "pdp-buybox": ShoppingCart,
  "pdp-details": Info,
  "pdp-related": Layers,
  breadcrumbs: ChevronsRight,
  embed: Code2,
  video: Play,
  accordion: ListTree,
  columns: Columns3,
  gallery: Images,
  tabs: PanelTopOpen,
  form: ClipboardList,
  "css-grid": LayoutGrid,
  row: Rows3,
  "custom-html": Code,
  "bundle-spotlight": Package,
  "gift-card-redeem": Gift,
  "recently-viewed": Clock,
  "reviews-list": Star,
  fbt: ShoppingBag,
  "size-guide": Ruler,
  "product-comparison": Columns2,
  lookbook: Images,
  "policy-strip": FileCheck,
  "nav-bar": Menu,
  "logo-mark": Tag,
  "utility-bar": Sliders,
  "footer-columns": Columns3,
  "social-links": Share2,
  "payment-icons": CreditCard,
  "copyright-bar": Copyright,
  "empty-state": CircleSlash,
};

function getBlockIcon(
  kind: string,
): React.ComponentType<{ size?: number; className?: string }> {
  return BLOCK_ICON[kind] ?? Box;
}

const RECENT_BLOCKS_KEY = "site-editor-recent-blocks";
const RECENT_BLOCKS_MAX = 6;

function loadRecentBlocks(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_BLOCKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function pushRecentBlock(kind: string) {
  if (typeof window === "undefined") return;
  try {
    const current = loadRecentBlocks().filter((k) => k !== kind);
    const next = [kind, ...current].slice(0, RECENT_BLOCKS_MAX);
    localStorage.setItem(RECENT_BLOCKS_KEY, JSON.stringify(next));
  } catch {
    // non-critical
  }
}

/**
 * In-memory style clipboard — survives the editor session, cleared on reload.
 * Shared across all Layers rows and the inspector's Paste button.
 */
let styleClipboard: BlockStyleOverride | null = null;
const styleClipboardListeners = new Set<() => void>();

function setStyleClipboard(style: BlockStyleOverride | null) {
  styleClipboard = style;
  styleClipboardListeners.forEach((cb) => cb());
}

function useStyleClipboard(): BlockStyleOverride | null {
  const [, force] = useState(0);
  useEffect(() => {
    const cb = () => force((x) => x + 1);
    styleClipboardListeners.add(cb);
    return () => {
      styleClipboardListeners.delete(cb);
    };
  }, []);
  return styleClipboard;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type EditorTarget = { scope: SiteLayoutScope; pageId: string | null };

function makeBlockId(): string {
  return `blk-${crypto.randomUUID().slice(0, 8)}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Accent color used across the editor UI */
const ACCENT = "oklch(0.62 0.08 150)";

function IconBtn({
  children,
  onClick,
  disabled,
  tooltip,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tooltip?: string;
  className?: string;
}) {
  return (
    <button
      title={tooltip}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Thin divider — pass `vertical` for a 1px tall line between inline items */
function Divider({
  vertical,
  className,
}: {
  vertical?: boolean;
  className?: string;
}) {
  if (vertical)
    return (
      <div className={cn("w-px self-stretch bg-border mx-0.5", className)} />
    );
  return <div className={cn("h-px bg-border", className)} />;
}

// --------------- Quick-add bar ---------------
function QuickAddBar({
  open,
  onClose,
  onAdd,
  scope: _scope,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (kind: string) => void;
  scope: SiteLayoutScope;
}) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 40);
      setQ("");
      setIdx(0);
    }
  }, [open]);

  const results = useMemo(
    () =>
      BLOCK_CATALOG.filter((b) => {
        if (q === "") return true;
        return (
          b.label.toLowerCase().includes(q.toLowerCase()) ||
          b.description.toLowerCase().includes(q.toLowerCase()) ||
          b.category.toLowerCase().includes(q.toLowerCase())
        );
      }).slice(0, 8),
    [q],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-foreground/20 backdrop-blur-sm flex items-start justify-center pt-24 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl shadow-2xl w-[520px] overflow-hidden border border-border animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 h-12 border-b border-border">
          <Search size={14} className="text-muted-foreground/60 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setIdx(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIdx((i) => Math.min(i + 1, results.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setIdx((i) => Math.max(i - 1, 0));
              }
              if (e.key === "Enter") {
                e.preventDefault();
                const r = results[idx];
                if (r) {
                  onAdd(r.kind);
                  onClose();
                }
              }
            }}
            placeholder="Add a block… (hero, product grid, heading)"
            className="flex-1 bg-transparent focus:outline-none text-[14px] text-foreground placeholder:text-muted-foreground/60"
          />
          <kbd className="text-[10.5px] px-1.5 py-0.5 rounded border border-border bg-muted/50 text-muted-foreground font-mono">
            ESC
          </kbd>
        </div>
        <div className="max-h-[360px] overflow-y-auto py-1">
          {results.map((b, i) => (
            <button
              key={b.kind}
              onClick={() => {
                onAdd(b.kind);
                onClose();
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 h-12 text-left transition-colors",
                i === idx ? "bg-muted/50" : "hover:bg-muted/50",
              )}
            >
              <div className="h-7 w-7 rounded bg-muted grid place-items-center shrink-0 text-muted-foreground">
                <Box size={13} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-foreground leading-tight">
                  {b.label}
                </div>
                <div className="text-[11px] text-muted-foreground truncate leading-tight">
                  {b.description}
                </div>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground/60 uppercase">
                {b.category}
              </span>
              {i === idx && (
                <kbd className="text-[10px] px-1 py-0.5 rounded border border-border bg-muted/50 text-muted-foreground font-mono">
                  ↵
                </kbd>
              )}
            </button>
          ))}
          {results.length === 0 && (
            <div className="px-4 py-8 text-center text-[12px] text-muted-foreground/60">
              No blocks match.
            </div>
          )}
        </div>
        <div className="border-t border-border px-4 py-2 flex items-center justify-between text-[10.5px] text-muted-foreground/60 bg-muted/50">
          <span className="flex items-center gap-3">
            <span>
              <kbd className="text-[10px] px-1 py-0.5 rounded border border-border bg-card font-mono">
                ↑↓
              </kbd>{" "}
              Navigate
            </span>
            <span>
              <kbd className="text-[10px] px-1 py-0.5 rounded border border-border bg-card font-mono">
                ↵
              </kbd>{" "}
              Insert
            </span>
          </span>
          <span>
            {results.length} of {BLOCK_CATALOG.length}
          </span>
        </div>
      </div>
    </div>
  );
}

// --------------- Publish modal ---------------
function PublishModal({
  open,
  onClose,
  onConfirm,
  dirty,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  dirty: boolean;
  isPending: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] bg-foreground/40 backdrop-blur-sm grid place-items-center animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl shadow-2xl w-[480px] overflow-hidden border border-border animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-border flex items-start gap-4">
          <div className="h-10 w-10 rounded-lg bg-emerald-50 grid place-items-center shrink-0">
            <Rocket size={18} className="text-emerald-700" />
          </div>
          <div className="flex-1">
            <div className="text-[15px] font-semibold text-foreground mb-0.5">
              {isPending ? "Publishing…" : "Publish to live?"}
            </div>
            <div className="text-[12.5px] text-muted-foreground">
              {isPending
                ? "Pushing changes to your live site…"
                : "All draft changes will become visible to your customers."}
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 grid place-items-center rounded text-muted-foreground/60 hover:bg-muted"
          >
            <X size={13} />
          </button>
        </div>
        <div className="p-5 bg-muted/50 flex flex-col gap-3">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">Draft status</span>
            <span className="font-mono text-foreground">
              {dirty ? "Unsaved changes" : "Up to date"}
            </span>
          </div>
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">Build</span>
            <span className="font-mono text-foreground">static · ISR</span>
          </div>
        </div>
        <div className="p-4 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="h-8 px-3 rounded-md border border-border text-[12.5px] font-medium text-foreground/80 hover:bg-muted/50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="h-8 px-3.5 rounded-md text-[12.5px] font-semibold text-white flex items-center gap-1.5 disabled:opacity-60"
            style={{ background: ACCENT }}
          >
            <Rocket size={12} />
            {isPending ? "Publishing…" : "Publish now"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --------------- Shortcuts modal ---------------
function ShortcutsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  const rows: [string, string][] = [
    ["⌘K", "Quick-add block"],
    ["⌘S", "Save draft"],
    ["⌘↵", "Publish"],
    ["⌘Z", "Undo"],
    ["⌘⇧Z", "Redo"],
    ["Del", "Delete selected block"],
    ["⌘D", "Duplicate selected block"],
    ["Esc", "Deselect"],
    ["1–8", "Switch panel"],
    ["?", "This panel"],
  ];
  return (
    <div
      className="fixed inset-0 z-[100] bg-foreground/40 backdrop-blur-sm grid place-items-center animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl shadow-2xl w-[400px] border border-border animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-11 px-4 flex items-center justify-between border-b border-border">
          <div className="text-[13px] font-semibold text-foreground">
            Keyboard shortcuts
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 grid place-items-center rounded text-muted-foreground/60 hover:bg-muted"
          >
            <X size={13} />
          </button>
        </div>
        <div className="p-4 flex flex-col gap-1">
          {rows.map(([k, label]) => (
            <div
              key={label}
              className="flex items-center justify-between h-7 text-[12.5px]"
            >
              <span className="text-muted-foreground">{label}</span>
              <kbd className="text-[11px] px-1.5 py-0.5 rounded border border-border border-b-2 bg-card text-muted-foreground font-mono">
                {k}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --------------- Pages panel ---------------
function PagesPanel({
  target,
  setTarget,
  customPages,
  onNewCustomPage,
  onEditPageDetails,
}: {
  target: EditorTarget;
  setTarget: (t: EditorTarget) => void;
  customPages: Array<{ id: string; title: string }>;
  onNewCustomPage: () => void;
  onEditPageDetails: (pageId: string) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = BUILT_IN_SCOPES.filter(
    (s) => q === "" || s.label.toLowerCase().includes(q.toLowerCase()),
  );
  const filteredCustom = customPages.filter(
    (p) => q === "" || p.title.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="flex flex-col h-full">
      <div className="h-11 px-3 flex items-center border-b border-border shrink-0">
        <span className="text-[13px] font-semibold text-foreground flex-1">
          Pages
        </span>
        <button
          onClick={onNewCustomPage}
          className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-muted"
          title="New custom page"
        >
          <Plus size={14} />
        </button>
      </div>
      <div className="px-3 pt-2.5 pb-2 shrink-0">
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/60"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search pages…"
            className="w-full h-7 pl-7 pr-2.5 rounded-md border border-border bg-muted/50 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2 mb-1">
            Site pages
          </div>
          <div className="flex flex-col gap-0.5">
            {filtered.map((s) => {
              const active = target.scope === s.value && target.pageId === null;
              return (
                <button
                  key={s.value}
                  onClick={() => setTarget({ scope: s.value, pageId: null })}
                  className={cn(
                    "group flex items-center gap-2.5 px-2 h-9 rounded-md w-full text-left transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground/80 hover:bg-muted/50",
                  )}
                >
                  <Hash
                    size={12}
                    className={cn(
                      active
                        ? "text-primary-foreground/60"
                        : "text-muted-foreground/60",
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium truncate">
                      {s.label}
                    </div>
                    <div
                      className={cn(
                        "text-[10.5px] font-mono truncate",
                        active
                          ? "text-primary-foreground/50"
                          : "text-muted-foreground/60",
                      )}
                    >
                      /{s.value}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between px-2 mb-1">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Custom pages
            </div>
            <button
              onClick={onNewCustomPage}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
              title="New custom page"
            >
              <Plus size={10} />
              New
            </button>
          </div>
          {filteredCustom.length === 0 && (
            <div className="px-2 py-3 text-[11.5px] text-muted-foreground/60 text-center">
              {customPages.length === 0
                ? "No custom pages yet."
                : "No pages match."}
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            {filteredCustom.map((p) => {
              const active = target.scope === "page" && target.pageId === p.id;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "group flex items-center gap-2 px-2 h-9 rounded-md transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground/80 hover:bg-muted/50",
                  )}
                >
                  <button
                    onClick={() => setTarget({ scope: "page", pageId: p.id })}
                    className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                    title="Edit layout blocks"
                  >
                    <Hash
                      size={12}
                      className={cn(
                        active
                          ? "text-primary-foreground/60"
                          : "text-muted-foreground/60",
                      )}
                    />
                    <div className="text-[12.5px] font-medium truncate flex-1">
                      {p.title}
                    </div>
                  </button>
                  <button
                    onClick={() => onEditPageDetails(p.id)}
                    className={cn(
                      "h-6 w-6 grid place-items-center rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0",
                      active
                        ? "hover:bg-primary-foreground/10 text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground",
                    )}
                    title="Edit page details"
                  >
                    <Pencil size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// --------------- Block thumbnails — mini CSS previews per kind ---------------
function BlockThumbnail({ kind }: { kind: string }) {
  // Color tokens reused across thumbnails
  const bar = "h-[3px] rounded-full bg-muted-foreground/40";
  const barStrong = "h-[3px] rounded-full bg-muted-foreground/60";
  const rect =
    "rounded-sm bg-muted-foreground/20 border border-muted-foreground/10";
  const rectStrong = "rounded-sm bg-muted-foreground/35";
  const pill = "rounded-full bg-primary/40";

  const shell =
    "relative w-full h-14 rounded-md bg-gradient-to-br from-muted/70 to-muted/30 border border-border overflow-hidden flex flex-col";

  switch (kind) {
    case "hero":
      return (
        <div className={shell}>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
          <div className="relative flex-1 flex flex-col items-center justify-center gap-1 px-3">
            <div className={cn(barStrong, "w-10")} />
            <div className={cn(bar, "w-16")} />
            <div className={cn(pill, "w-8 h-2 mt-0.5")} />
          </div>
        </div>
      );

    case "heading":
      return (
        <div className={cn(shell, "justify-center items-center gap-1.5")}>
          <div className="h-[5px] rounded-full bg-muted-foreground/70 w-16" />
          <div className={cn(bar, "w-20")} />
        </div>
      );

    case "rich-text":
    case "markdown-body":
      return (
        <div className={cn(shell, "justify-center gap-1 px-3")}>
          <div className={cn(bar, "w-[85%]")} />
          <div className={cn(bar, "w-[70%]")} />
          <div className={cn(bar, "w-[80%]")} />
          <div className={cn(bar, "w-[55%]")} />
        </div>
      );

    case "image":
    case "video":
      return (
        <div className={shell}>
          <div className="absolute inset-1.5 rounded bg-muted-foreground/25 grid place-items-center">
            {kind === "video" ? (
              <div className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-background ml-1" />
            ) : (
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 text-background/80"
                fill="currentColor"
              >
                <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2ZM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5Z" />
              </svg>
            )}
          </div>
        </div>
      );

    case "button":
      return (
        <div className={cn(shell, "justify-center items-center")}>
          <div className="h-5 w-16 rounded-full bg-primary/70" />
        </div>
      );

    case "divider":
      return (
        <div className={cn(shell, "justify-center items-center")}>
          <div className="h-px w-[80%] bg-muted-foreground/50" />
        </div>
      );

    case "spacer":
      return (
        <div className={shell}>
          <div className="flex-1" />
          <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-3 rounded-sm bg-muted-foreground/10 border border-dashed border-muted-foreground/30" />
        </div>
      );

    case "product-grid":
    case "collection-cards":
      return (
        <div className={shell}>
          <div className="grid grid-cols-3 gap-1 p-1.5 h-full">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={cn(rect, "h-full")} />
            ))}
          </div>
        </div>
      );

    case "category-tiles":
    case "gallery":
    case "lookbook":
    case "bento-showcase":
      return (
        <div className={shell}>
          <div className="grid grid-cols-3 gap-1 p-1.5 h-full">
            <div className={cn(rect, "row-span-2")} />
            <div className={rect} />
            <div className={rect} />
            <div className={rect} />
            <div className={rect} />
          </div>
        </div>
      );

    case "columns":
    case "story-split":
    case "product-comparison":
      return (
        <div className={shell}>
          <div className="grid grid-cols-2 gap-1 p-1.5 h-full">
            <div className={cn(rect, "h-full")} />
            <div className={cn(rect, "h-full")} />
          </div>
        </div>
      );

    case "row":
    case "section":
      return (
        <div className={shell}>
          <div className="flex gap-1 p-1.5 h-full">
            <div className={cn(rect, "flex-1")} />
            <div className={cn(rect, "flex-1")} />
            <div className={cn(rect, "flex-1")} />
          </div>
        </div>
      );

    case "css-grid":
      return (
        <div className={shell}>
          <div className="grid grid-cols-4 grid-rows-2 gap-0.5 p-1.5 h-full">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className={rect} />
            ))}
          </div>
        </div>
      );

    case "product-listing":
      return (
        <div className={shell}>
          <div className="grid grid-cols-[auto_1fr] gap-1 p-1.5 h-full">
            <div className="flex flex-col gap-1 w-5">
              <div className={cn(rect, "h-1.5")} />
              <div className={cn(rect, "h-1.5")} />
              <div className={cn(rect, "h-1.5")} />
            </div>
            <div className="grid grid-cols-3 gap-1 h-full">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={cn(rect, "h-full")} />
              ))}
            </div>
          </div>
        </div>
      );

    case "product-filters":
    case "utility-bar":
      return (
        <div className={shell}>
          <div className="flex items-center gap-1 px-2 h-full">
            <div className="h-3 w-8 rounded-sm bg-muted-foreground/30" />
            <div className="h-3 w-10 rounded-sm bg-muted-foreground/30" />
            <div className="h-3 w-6 rounded-sm bg-muted-foreground/30" />
            <div className="h-3 w-8 rounded-sm bg-muted-foreground/30" />
          </div>
        </div>
      );

    case "announcement-bar":
      return (
        <div className={cn(shell, "items-center justify-center")}>
          <div className="w-full h-3 bg-primary/70" />
          <div className="flex-1 w-full" />
        </div>
      );

    case "trust-strip":
    case "logo-cloud":
    case "payment-icons":
      return (
        <div className={cn(shell, "items-center justify-center")}>
          <div className="flex items-center gap-1.5 px-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-4 w-6 rounded-sm bg-muted-foreground/35"
              />
            ))}
          </div>
        </div>
      );

    case "stats-band":
      return (
        <div className={shell}>
          <div className="grid grid-cols-3 gap-1 p-1.5 h-full items-center">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <div className="h-2 w-5 rounded-sm bg-muted-foreground/60" />
                <div className="h-1 w-7 rounded-sm bg-muted-foreground/30" />
              </div>
            ))}
          </div>
        </div>
      );

    case "newsletter":
    case "contact-block":
    case "form":
      return (
        <div className={shell}>
          <div className="flex flex-col gap-1 p-2 h-full justify-center">
            <div className="h-3 rounded-sm bg-muted-foreground/15 border border-muted-foreground/25" />
            <div className="flex gap-1 items-center">
              <div className="flex-1 h-3 rounded-sm bg-muted-foreground/15 border border-muted-foreground/25" />
              <div className="h-3 w-8 rounded-sm bg-primary/70" />
            </div>
          </div>
        </div>
      );

    case "faq":
    case "accordion":
      return (
        <div className={shell}>
          <div className="flex flex-col gap-1 p-1.5 h-full">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between h-3 px-1 rounded-sm bg-muted-foreground/15 border border-muted-foreground/20"
              >
                <div className="h-1 w-8 rounded-sm bg-muted-foreground/45" />
                <div className="text-[7px] text-muted-foreground/50">＋</div>
              </div>
            ))}
          </div>
        </div>
      );

    case "testimonials":
    case "reviews-list":
      return (
        <div className={shell}>
          <div className="flex flex-col gap-1 p-2 h-full justify-center">
            <div className="text-[10px] leading-none text-muted-foreground/50 font-serif">
              &ldquo;
            </div>
            <div className={cn(bar, "w-[85%]")} />
            <div className={cn(bar, "w-[70%]")} />
            <div className="flex gap-0.5 mt-0.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-1 w-1 rounded-full bg-amber-400" />
              ))}
            </div>
          </div>
        </div>
      );

    case "blog-list":
      return (
        <div className={shell}>
          <div className="grid grid-cols-3 gap-1 p-1.5 h-full">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <div className={cn(rect, "flex-1")} />
                <div className="h-1 rounded-sm bg-muted-foreground/50" />
                <div className="h-1 w-3/4 rounded-sm bg-muted-foreground/30" />
              </div>
            ))}
          </div>
        </div>
      );

    case "pdp-gallery":
      return (
        <div className={shell}>
          <div className="grid grid-cols-[auto_1fr] gap-1 p-1.5 h-full">
            <div className="flex flex-col gap-0.5 w-3">
              <div className={rectStrong + " h-2"} />
              <div className={rectStrong + " h-2"} />
              <div className={rectStrong + " h-2"} />
            </div>
            <div className={cn(rect, "h-full")} />
          </div>
        </div>
      );

    case "pdp-buybox":
      return (
        <div className={shell}>
          <div className="flex flex-col gap-1 p-2 h-full">
            <div className="h-2 w-[55%] rounded-sm bg-muted-foreground/50" />
            <div className="h-1.5 w-[35%] rounded-sm bg-muted-foreground/30" />
            <div className="flex gap-1 mt-auto">
              <div className="h-3 flex-1 rounded-sm bg-primary/70" />
              <div className="h-3 w-5 rounded-sm bg-muted-foreground/30" />
            </div>
          </div>
        </div>
      );

    case "pdp-details":
    case "pdp-related":
    case "fbt":
    case "recently-viewed":
      return (
        <div className={shell}>
          <div className="grid grid-cols-4 gap-1 p-1.5 h-full">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={cn(rect, "h-full")} />
            ))}
          </div>
        </div>
      );

    case "tabs":
      return (
        <div className={shell}>
          <div className="flex gap-0.5 px-1.5 pt-1.5">
            <div className="h-2 w-6 rounded-t-sm bg-muted-foreground/60" />
            <div className="h-2 w-6 rounded-t-sm bg-muted-foreground/25" />
            <div className="h-2 w-6 rounded-t-sm bg-muted-foreground/25" />
          </div>
          <div className="flex-1 mx-1.5 mb-1.5 rounded-b-sm bg-muted-foreground/20 border border-muted-foreground/15 border-t-0" />
        </div>
      );

    case "breadcrumbs":
      return (
        <div className={cn(shell, "items-center justify-center")}>
          <div className="flex items-center gap-1 px-2">
            <div className="h-1 w-5 rounded-sm bg-muted-foreground/35" />
            <span className="text-[8px] text-muted-foreground/40">›</span>
            <div className="h-1 w-6 rounded-sm bg-muted-foreground/35" />
            <span className="text-[8px] text-muted-foreground/40">›</span>
            <div className="h-1 w-4 rounded-sm bg-muted-foreground/55" />
          </div>
        </div>
      );

    case "nav-bar":
      return (
        <div className={shell}>
          <div className="flex items-center justify-between px-2 h-full">
            <div className="h-2.5 w-5 rounded-sm bg-muted-foreground/60" />
            <div className="flex gap-1">
              <div className="h-1 w-4 rounded-sm bg-muted-foreground/35" />
              <div className="h-1 w-5 rounded-sm bg-muted-foreground/35" />
              <div className="h-1 w-4 rounded-sm bg-muted-foreground/35" />
            </div>
            <div className="h-2.5 w-4 rounded-sm bg-primary/60" />
          </div>
        </div>
      );

    case "footer-columns":
    case "copyright-bar":
      return (
        <div className={shell}>
          <div className="grid grid-cols-4 gap-1 p-1.5 h-full">
            {[0, 1, 2, 3].map((c) => (
              <div key={c} className="flex flex-col gap-0.5">
                <div className="h-1.5 rounded-sm bg-muted-foreground/55" />
                <div className="h-1 rounded-sm bg-muted-foreground/25" />
                <div className="h-1 rounded-sm bg-muted-foreground/25" />
                <div className="h-1 w-2/3 rounded-sm bg-muted-foreground/25" />
              </div>
            ))}
          </div>
        </div>
      );

    case "social-links":
      return (
        <div className={cn(shell, "items-center justify-center gap-1")}>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-4 w-4 rounded-full bg-muted-foreground/45"
              />
            ))}
          </div>
        </div>
      );

    case "bundle-spotlight":
    case "gift-card-redeem":
      return (
        <div className={shell}>
          <div className="flex items-center gap-1.5 p-1.5 h-full">
            <div className={cn(rect, "w-10 h-full")} />
            <div className="flex flex-col gap-1 flex-1">
              <div className={cn(bar, "w-full")} />
              <div className={cn(bar, "w-[70%]")} />
              <div className={cn(pill, "w-8 h-2 mt-0.5")} />
            </div>
          </div>
        </div>
      );

    case "size-guide":
    case "policy-strip":
      return (
        <div className={shell}>
          <div className="flex flex-col gap-0.5 p-1.5 h-full justify-center">
            <div className="flex gap-1">
              <div className={cn(bar, "w-6")} />
              <div className={cn(bar, "w-6")} />
              <div className={cn(bar, "w-6")} />
            </div>
            <div className="flex gap-1">
              <div className={cn(barStrong, "w-6")} />
              <div className={cn(bar, "w-6")} />
              <div className={cn(bar, "w-6")} />
            </div>
          </div>
        </div>
      );

    case "logo-mark":
      return (
        <div className={cn(shell, "items-center justify-center")}>
          <div className="h-6 w-6 rounded-md bg-primary/70 grid place-items-center text-primary-foreground text-[10px] font-bold">
            A
          </div>
        </div>
      );

    case "embed":
    case "custom-html":
      return (
        <div className={cn(shell, "items-center justify-center")}>
          <div className="text-[10px] font-mono text-muted-foreground/60">
            &lt;/&gt;
          </div>
        </div>
      );

    case "empty-state":
      return (
        <div className={cn(shell, "items-center justify-center")}>
          <CircleSlash size={18} className="text-muted-foreground/50" />
        </div>
      );

    default: {
      const Icon = getBlockIcon(kind);
      return (
        <div className={cn(shell, "items-center justify-center")}>
          <div className="h-8 w-8 rounded-md bg-card border border-border grid place-items-center text-muted-foreground">
            <Icon size={15} />
          </div>
        </div>
      );
    }
  }
}

// --------------- Blocks panel ---------------
/** Offscreen chip that palette drags use as their drag preview. */
function BlockDragChip({
  chipRef,
}: {
  chipRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={chipRef}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-[-9999px] flex items-center gap-2 h-9 pr-3 pl-2 rounded-md border border-primary/60 bg-card shadow-lg z-[200]"
    >
      <div className="h-6 w-6 rounded bg-primary/15 grid place-items-center text-primary">
        <Plus size={13} />
      </div>
      <span className="text-[12.5px] font-semibold text-foreground whitespace-nowrap">
        Block
      </span>
    </div>
  );
}

function BlockCatalogCard({
  entry,
  onAdd,
  dragChipRef,
}: {
  entry: (typeof BLOCK_CATALOG)[number];
  onAdd: (kind: string) => void;
  dragChipRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const Icon = getBlockIcon(entry.kind);
  return (
    <button
      onClick={() => onAdd(entry.kind)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("block-kind", entry.kind);
        e.dataTransfer.effectAllowed = "copy";
        const chip = dragChipRef?.current;
        if (chip) {
          const span = chip.querySelector("span");
          if (span) span.textContent = entry.label;
          try {
            e.dataTransfer.setDragImage(chip, 24, 16);
          } catch {
            // setDragImage unsupported — fall back to default preview
          }
        }
      }}
      className="group relative flex flex-col gap-1.5 p-1.5 rounded-md border border-border bg-card hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 text-left transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <BlockThumbnail kind={entry.kind} />
      <div className="px-0.5 pb-0.5 flex items-start gap-1.5">
        <div className="h-5 w-5 shrink-0 rounded bg-muted grid place-items-center text-muted-foreground group-hover:text-primary transition-colors">
          <Icon size={11} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11.5px] font-semibold text-foreground leading-tight truncate">
            {entry.label}
          </div>
          <div className="text-[9.5px] text-muted-foreground/60 leading-tight mt-0.5 line-clamp-1">
            {entry.description}
          </div>
        </div>
        <Plus
          size={11}
          className="text-muted-foreground/60 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        />
      </div>
    </button>
  );
}

function BlocksPanel({
  onAdd,
  dragChipRef,
}: {
  onAdd: (kind: string) => void;
  dragChipRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("All");
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setRecent(loadRecentBlocks());
  }, []);

  const handleAdd = useCallback(
    (kind: string) => {
      pushRecentBlock(kind);
      setRecent(loadRecentBlocks());
      onAdd(kind);
    },
    [onAdd],
  );

  const filtered = BLOCK_CATALOG.filter(
    (b) =>
      (group === "All" || b.category.toLowerCase() === group.toLowerCase()) &&
      (q === "" ||
        b.label.toLowerCase().includes(q.toLowerCase()) ||
        b.description.toLowerCase().includes(q.toLowerCase())),
  );

  const recentEntries =
    group === "All" && q === ""
      ? recent
          .map((kind) => BLOCK_CATALOG.find((b) => b.kind === kind))
          .filter((x): x is (typeof BLOCK_CATALOG)[number] => !!x)
          .slice(0, RECENT_BLOCKS_MAX)
      : [];

  return (
    <div className="flex flex-col h-full">
      <div className="h-11 px-3 flex items-center border-b border-border shrink-0">
        <span className="text-[13px] font-semibold text-foreground">
          Add blocks
        </span>
      </div>
      <div className="px-3 pt-2.5 pb-2 flex flex-col gap-2 shrink-0">
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/60"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search 60+ blocks…"
            className="w-full h-7 pl-7 pr-2.5 rounded-md border border-border bg-muted/50 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {BLOCK_GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={cn(
                "h-6 px-2 rounded-full text-[11px] font-medium transition-colors",
                group === g
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3">
        {recentEntries.length > 0 && (
          <section>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1.5 flex items-center gap-1">
              <History size={10} />
              Recently used
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {recentEntries.map((b) => (
                <BlockCatalogCard
                  key={`recent-${b.kind}`}
                  entry={b}
                  onAdd={handleAdd}
                  dragChipRef={dragChipRef}
                />
              ))}
            </div>
          </section>
        )}

        <section>
          {recentEntries.length > 0 && (
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1.5">
              All blocks
            </div>
          )}
          <div className="grid grid-cols-2 gap-1.5">
            {filtered.map((b) => (
              <BlockCatalogCard
                key={b.kind}
                entry={b}
                onAdd={handleAdd}
                dragChipRef={dragChipRef}
              />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-8 text-[12px] text-muted-foreground/60">
              No blocks match.
            </div>
          )}
        </section>
      </div>
      <div className="border-t border-border px-3 py-2 flex items-center justify-between text-[10.5px] text-muted-foreground/60 shrink-0">
        <span>{filtered.length} blocks</span>
        <span className="font-mono">Drag or click</span>
      </div>
    </div>
  );
}

// --------------- Block context menu (shared by Layers rows + floating toolbar) ---------------
type BlockMenuState = {
  blockId: string;
  x: number;
  y: number;
} | null;

function BlockContextMenu({
  state,
  blocks,
  onClose,
}: {
  state: BlockMenuState;
  blocks: BlockNode[];
  onClose: () => void;
}) {
  const moveBlock = useEditorStore((s) => s.moveBlock);
  const duplicateBlock = useEditorStore((s) => s.duplicateBlock);
  const removeBlock = useEditorStore((s) => s.removeBlock);
  const updateBlockStyle = useEditorStore((s) => s.updateBlockStyle);
  const clipboard = useStyleClipboard();
  const { toast } = useToast();

  useEffect(() => {
    if (!state) return;
    const onDocClick = () => onClose();
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // Delay attaching so the opening click doesn't immediately close it.
    const t = window.setTimeout(() => {
      document.addEventListener("click", onDocClick);
      document.addEventListener("keydown", onEsc);
    }, 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [state, onClose]);

  if (!state) return null;
  const idx = blocks.findIndex((b) => b.id === state.blockId);
  if (idx < 0) return null;
  const block = blocks[idx]!;
  const canUp = idx > 0;
  const canDown = idx < blocks.length - 1;

  const handle = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
    onClose();
  };

  // Clamp to viewport so menu doesn't clip at edges (approximate 200px wide × 260 tall).
  const MENU_W = 210;
  const MENU_H = 280;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const left = Math.min(state.x, vw - MENU_W - 8);
  const top = Math.min(state.y, vh - MENU_H - 8);

  return (
    <div
      role="menu"
      className="fixed z-[110] min-w-[200px] rounded-md border border-border bg-card shadow-xl py-1 text-[12.5px] animate-in fade-in zoom-in-95 duration-100"
      style={{ left, top }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <BlockMenuItem
        icon={ChevronUp}
        label="Move up"
        disabled={!canUp}
        onClick={handle(() => moveBlock(state.blockId, -1))}
      />
      <BlockMenuItem
        icon={ChevronDown}
        label="Move down"
        disabled={!canDown}
        onClick={handle(() => moveBlock(state.blockId, 1))}
      />
      <BlockMenuItem
        icon={Copy}
        label="Duplicate"
        kbd="⌘D"
        onClick={handle(() => duplicateBlock(state.blockId))}
      />
      <BlockMenuDivider />
      <BlockMenuItem
        icon={Palette}
        label="Copy styles"
        onClick={handle(() => {
          setStyleClipboard(block.style ?? {});
          toast({ title: "Styles copied" });
        })}
      />
      <BlockMenuItem
        icon={ClipboardList}
        label={clipboard ? "Paste styles" : "Paste styles (empty)"}
        disabled={!clipboard}
        onClick={handle(() => {
          if (!clipboard) return;
          updateBlockStyle(state.blockId, clipboard);
          toast({ title: "Styles pasted" });
        })}
      />
      <BlockMenuDivider />
      <BlockMenuItem
        icon={Trash2}
        label="Delete"
        kbd="⌫"
        destructive
        onClick={handle(() => removeBlock(state.blockId))}
      />
    </div>
  );
}

function BlockMenuItem({
  icon: Icon,
  label,
  kbd,
  disabled,
  destructive,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  kbd?: string;
  disabled?: boolean;
  destructive?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-2.5 h-7 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground/90 hover:bg-muted",
      )}
    >
      <Icon
        size={12}
        className={cn(
          destructive ? "text-destructive" : "text-muted-foreground",
        )}
      />
      <span className="flex-1">{label}</span>
      {kbd && (
        <kbd className="text-[10px] font-mono text-muted-foreground/60">
          {kbd}
        </kbd>
      )}
    </button>
  );
}

function BlockMenuDivider() {
  return <div className="h-px bg-border my-0.5" />;
}

// --------------- Layers panel ---------------
function LayersPanel({
  blocks,
  selectedId,
  onContextMenu,
}: {
  blocks: BlockNode[];
  selectedId: string | null;
  onContextMenu: (blockId: string, x: number, y: number) => void;
}) {
  const setSelected = useEditorStore((s) => s.setSelected);
  const moveBlock = useEditorStore((s) => s.moveBlock);
  const removeBlock = useEditorStore((s) => s.removeBlock);
  const duplicateBlock = useEditorStore((s) => s.duplicateBlock);
  const updateBlockVisibility = useEditorStore((s) => s.updateBlockVisibility);

  return (
    <div className="flex flex-col h-full">
      <div className="h-11 px-3 flex items-center border-b border-border shrink-0">
        <span className="text-[13px] font-semibold text-foreground flex-1">
          Layers
        </span>
        <span className="text-[11px] text-muted-foreground/60 font-mono">
          {blocks.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {blocks.length === 0 && (
          <div className="text-center py-12 px-4 text-[12px] text-muted-foreground/80">
            <div className="relative mx-auto mb-3 h-12 w-12">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/10 to-transparent blur-md" />
              <div className="relative h-12 w-12 rounded-xl bg-muted border border-border grid place-items-center">
                <Layers size={20} className="text-muted-foreground/60" />
              </div>
            </div>
            <div className="text-[12.5px] font-medium text-foreground/80 mb-0.5">
              No blocks yet
            </div>
            <div className="text-[11px] text-muted-foreground/60">
              Add one from the palette to start.
            </div>
          </div>
        )}
        {blocks.map((b, i) => {
          const entry = BLOCK_CATALOG.find((c) => c.kind === b.kind);
          const title =
            ((b.props as Record<string, unknown>)?.heading as string) ||
            ((b.props as Record<string, unknown>)?.text as string) ||
            entry?.label ||
            b.kind;
          const hidden = b.visibility?.desktop === false;
          const active = selectedId === b.id;
          return (
            <div
              key={b.id}
              onClick={() => setSelected(b.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setSelected(b.id);
                onContextMenu(b.id, e.clientX, e.clientY);
              }}
              className={cn(
                "group flex items-center gap-1.5 px-2 h-9 rounded-md cursor-pointer transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted/50 text-foreground/80",
              )}
            >
              <GripVertical
                size={11}
                className={cn(
                  "shrink-0",
                  active
                    ? "text-primary-foreground/40"
                    : "text-muted-foreground/30",
                )}
              />
              <Box
                size={12}
                className={cn(
                  "shrink-0",
                  active
                    ? "text-primary-foreground"
                    : "text-muted-foreground/60",
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium truncate leading-tight">
                  {title}
                </div>
                <div
                  className={cn(
                    "text-[10px] truncate font-mono leading-tight",
                    active
                      ? "text-primary-foreground/50"
                      : "text-muted-foreground/60",
                  )}
                >
                  {entry?.label ?? b.kind}
                </div>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moveBlock(b.id, -1);
                  }}
                  disabled={i === 0}
                  className={cn(
                    "h-5 w-5 grid place-items-center rounded disabled:opacity-30",
                    active
                      ? "hover:bg-primary-foreground/10 text-primary-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  <ChevronUp size={10} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moveBlock(b.id, 1);
                  }}
                  disabled={i === blocks.length - 1}
                  className={cn(
                    "h-5 w-5 grid place-items-center rounded disabled:opacity-30",
                    active
                      ? "hover:bg-primary-foreground/10 text-primary-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  <ChevronDown size={10} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateBlockVisibility(b.id, { desktop: !!hidden });
                  }}
                  className={cn(
                    "h-5 w-5 grid place-items-center rounded",
                    active
                      ? "hover:bg-primary-foreground/10 text-primary-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  {hidden ? <EyeOff size={10} /> : <Eye size={10} />}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateBlock(b.id);
                  }}
                  className={cn(
                    "h-5 w-5 grid place-items-center rounded",
                    active
                      ? "hover:bg-primary-foreground/10 text-primary-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  <Copy size={10} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeBlock(b.id);
                  }}
                  className={cn(
                    "h-5 w-5 grid place-items-center rounded hover:text-red-400",
                    active
                      ? "hover:bg-primary-foreground/10 text-primary-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  <Trash2 size={10} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --------------- Overview panel ---------------
function OverviewPanel({
  config,
  onGoToPanel,
}: {
  config: SiteConfig;
  onGoToPanel: (p: PanelId) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="h-11 px-3 flex items-center border-b border-border shrink-0">
        <span className="text-[13px] font-semibold text-foreground">
          Overview
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <SiteOverviewTab
          config={config}
          onGoToTab={(tab) => onGoToPanel(tab as PanelId)}
        />
      </div>
    </div>
  );
}

// --------------- Branding panel ---------------
function BrandingPanel({ config }: { config: SiteConfig }) {
  return (
    <div className="flex flex-col h-full">
      <div className="h-11 px-3 flex items-center border-b border-border shrink-0">
        <span className="text-[13px] font-semibold text-foreground">
          Branding
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <SiteTemplatePicker activeTemplateId={config.templateId} />
        <SiteBrandingForm branding={config.branding} />
      </div>
    </div>
  );
}

// --------------- Theme panel (real ThemeTokensForm) ---------------
function ThemePanel({ config }: { config: SiteConfig }) {
  return (
    <div className="flex flex-col h-full">
      <div className="h-11 px-3 flex items-center border-b border-border shrink-0">
        <span className="text-[13px] font-semibold text-foreground">Theme</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ThemeTokensForm themeTokens={config.themeTokens} />
      </div>
    </div>
  );
}

// --------------- Nav panel (real NavMenuPanel) ---------------
function NavPanel() {
  return (
    <div className="flex flex-col h-full">
      <div className="h-11 px-3 flex items-center border-b border-border shrink-0">
        <span className="text-[13px] font-semibold text-foreground">
          Navigation
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <NavMenuPanel />
      </div>
    </div>
  );
}

// --------------- SEO panel (real SiteSeoForm) ---------------
function SEOPanel({ config }: { config: SiteConfig }) {
  return (
    <div className="flex flex-col h-full">
      <div className="h-11 px-3 flex items-center border-b border-border shrink-0">
        <span className="text-[13px] font-semibold text-foreground">SEO</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <SiteSeoForm seo={config.seo} />
      </div>
    </div>
  );
}

// --------------- Contact panel ---------------
function ContactPanel({ config }: { config: SiteConfig }) {
  return (
    <div className="flex flex-col h-full">
      <div className="h-11 px-3 flex items-center border-b border-border shrink-0">
        <span className="text-[13px] font-semibold text-foreground">
          Contact
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <SiteContactForm contact={config.contact} />
      </div>
    </div>
  );
}

// --------------- Domain panel ---------------
function DomainPanel({ tenantId }: { tenantId: string | null }) {
  const [addOpen, setAddOpen] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState<TenantDomain | null>(null);
  const domainsQuery = useTenantDomains(tenantId);
  const deleteDomain = useDeleteTenantDomain();
  const { toast } = useToast();

  const handleDelete = (domain: TenantDomain) => {
    deleteDomain.mutate(domain.id, {
      onSuccess: () => toast({ title: "Domain removed" }),
      onError: () =>
        toast({ title: "Failed to remove domain", variant: "destructive" }),
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="h-11 px-3 flex items-center border-b border-border shrink-0">
        <span className="text-[13px] font-semibold text-foreground flex-1">
          Domains
        </span>
        <button
          onClick={() => setAddOpen(true)}
          className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-muted"
        >
          <Plus size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {domainsQuery.isLoading && (
          <div className="text-center py-8 text-[12px] text-muted-foreground/60">
            Loading…
          </div>
        )}
        {domainsQuery.data?.map((domain) => (
          <div
            key={domain.id}
            className="p-3 rounded-md border border-border bg-card text-[12px] flex items-start gap-2"
          >
            <Globe
              size={13}
              className="shrink-0 text-muted-foreground mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground truncate">
                {domain.hostname}
              </div>
              <div className="text-muted-foreground/60 flex items-center gap-1 mt-0.5">
                {domain.verifiedAt ? (
                  <>
                    <CheckCircle2 size={10} className="text-emerald-500" />
                    <span>Verified</span>
                  </>
                ) : (
                  <>
                    <Clock size={10} className="text-amber-500" />
                    <span>Pending DNS</span>
                  </>
                )}
                {domain.isPrimary && (
                  <span className="ml-1 px-1 rounded bg-primary/10 text-primary text-[10px] font-medium">
                    Primary
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              {!domain.verifiedAt && (
                <button
                  onClick={() => setVerifyTarget(domain)}
                  className="h-6 px-2 rounded text-[11px] border border-border hover:bg-muted text-muted-foreground transition-colors"
                >
                  Verify
                </button>
              )}
              <button
                onClick={() => handleDelete(domain)}
                disabled={deleteDomain.isPending}
                className="h-6 w-6 grid place-items-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
              >
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        ))}
        {!domainsQuery.isLoading && (domainsQuery.data?.length ?? 0) === 0 && (
          <div className="text-center py-8 px-3 text-[12px] text-muted-foreground/80">
            <div className="relative mx-auto mb-3 h-12 w-12">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/10 to-transparent blur-md" />
              <div className="relative h-12 w-12 rounded-xl bg-muted border border-border grid place-items-center">
                <Link2 size={20} className="text-muted-foreground/60" />
              </div>
            </div>
            <div className="text-[12.5px] font-medium text-foreground/80 mb-0.5">
              No custom domains
            </div>
            <div className="text-[11px] text-muted-foreground/60">
              Add one to point a domain at your site.
            </div>
          </div>
        )}
        <button
          onClick={() => setAddOpen(true)}
          className="w-full h-8 rounded-md border border-dashed border-border text-[12px] text-muted-foreground hover:bg-muted/50 flex items-center justify-center gap-1.5 transition-colors"
        >
          <Plus size={12} />
          Add domain
        </button>
      </div>
      {tenantId && (
        <AddDomainDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          tenantId={tenantId}
        />
      )}
      <VerifyDomainDialog
        open={!!verifyTarget}
        onOpenChange={(o) => !o && setVerifyTarget(null)}
        domain={verifyTarget}
      />
    </div>
  );
}

// --------------- Media panel ---------------
function MediaPanel() {
  return (
    <div className="flex flex-col h-full">
      <div className="h-11 px-3 flex items-center border-b border-border shrink-0">
        <span className="text-[13px] font-semibold text-foreground flex-1">
          Media
        </span>
        <button className="h-7 w-7 grid place-items-center rounded text-muted-foreground/60 hover:bg-muted hover:text-foreground/80">
          <Plus size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col items-center justify-center gap-2 h-32 rounded-lg border-2 border-dashed border-border text-[12px] text-muted-foreground/60 hover:border-primary/30 hover:bg-accent/20 cursor-pointer transition-colors">
          <Image size={20} className="opacity-40" />
          <span>Drop files or click to upload</span>
        </div>
      </div>
    </div>
  );
}

// --------------- Blog panel (post list + filter + click-to-edit) ---------------
function BlogPanel({
  onNew,
  onEdit,
}: {
  onNew: () => void;
  onEdit: (postId: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<BlogPostStatus | "ALL">(
    "ALL",
  );
  const [search, setSearch] = useState("");
  const postsQuery = useBlogPosts({
    limit: 50,
    ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
  });
  const deletePost = useDeleteBlogPost();
  const { toast } = useToast();
  const posts = postsQuery.data?.posts ?? [];

  const handleDelete = (post: BlogPostListItem) => {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    deletePost.mutate(post.id, {
      onSuccess: () => toast({ title: "Post deleted" }),
      onError: () => toast({ title: "Delete failed", variant: "destructive" }),
    });
  };

  const filters: { value: BlogPostStatus | "ALL"; label: string }[] = [
    { value: "ALL", label: "All" },
    { value: "DRAFT", label: "Drafts" },
    { value: "PUBLISHED", label: "Live" },
    { value: "ARCHIVED", label: "Archived" },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="h-11 px-3 flex items-center border-b border-border shrink-0">
        <span className="text-[13px] font-semibold text-foreground flex-1">
          Blog
        </span>
        <button
          onClick={onNew}
          className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-muted"
          title="New post"
        >
          <Plus size={14} />
        </button>
      </div>
      <div className="px-3 pt-2.5 pb-2 flex flex-col gap-2 shrink-0">
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/60"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts…"
            className="w-full h-7 pl-7 pr-2.5 rounded-md border border-border bg-muted/50 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "h-6 px-2 rounded-full text-[11px] font-medium transition-colors",
                statusFilter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-1">
        {postsQuery.isLoading && (
          <div className="text-center py-8 text-[12px] text-muted-foreground/60">
            Loading…
          </div>
        )}
        {posts.map((post) => (
          <div
            key={post.id}
            className="group flex items-start gap-2 px-2 py-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => onEdit(post.id)}
          >
            <FileText
              size={13}
              className="shrink-0 text-muted-foreground/60 mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-medium text-foreground truncate leading-tight">
                {post.title || "Untitled"}
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <BlogStatusBadge status={post.status} />
                {post.category && (
                  <span className="text-[10px] text-muted-foreground/70 truncate">
                    · {post.category.name}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(post);
              }}
              className="h-6 w-6 grid place-items-center rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
              title="Delete"
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}
        {!postsQuery.isLoading && posts.length === 0 && (
          <div className="text-center py-8 px-3 text-[12px] text-muted-foreground/80">
            <div className="relative mx-auto mb-3 h-12 w-12">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/10 to-transparent blur-md" />
              <div className="relative h-12 w-12 rounded-xl bg-muted border border-border grid place-items-center">
                <FileText size={20} className="text-muted-foreground/60" />
              </div>
            </div>
            <div className="text-[12.5px] font-medium text-foreground/80 mb-0.5">
              {search || statusFilter !== "ALL"
                ? "No posts match"
                : "No blog posts yet"}
            </div>
            <div className="text-[11px] text-muted-foreground/60">
              {search || statusFilter !== "ALL"
                ? "Try clearing filters or a different search."
                : "Write your first post to get started."}
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-border px-3 py-2 shrink-0">
        <button
          onClick={onNew}
          className="flex items-center justify-center gap-1.5 h-7 px-3 rounded-md border border-dashed border-border text-[12px] text-muted-foreground hover:bg-muted/50 transition-colors w-full"
        >
          <Plus size={12} /> New post
        </button>
      </div>
    </div>
  );
}

// --------------- Blog editor workspace (takeover panel + canvas area) ---------------
function BlogEditorWorkspace({
  target,
  onClose,
  onCreated,
}: {
  target: { mode: "new" } | { mode: "edit"; postId: string };
  onClose: () => void;
  onCreated: (post: BlogPost) => void;
}) {
  const postQuery = useBlogPost(target.mode === "edit" ? target.postId : null);
  const post = target.mode === "edit" ? (postQuery.data ?? null) : null;
  const loading = target.mode === "edit" && postQuery.isLoading;

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden min-h-0">
      <div className="h-11 border-b border-border bg-card flex items-center gap-2 px-3 shrink-0">
        <button
          onClick={onClose}
          className="h-7 px-2 rounded hover:bg-muted text-[12px] text-foreground/80 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft size={12} />
          Back to blog
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <div className="text-[13px] font-semibold text-foreground">
          {target.mode === "new" ? "New post" : "Edit post"}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {loading ? (
            <div className="text-center py-16 text-[13px] text-muted-foreground/60">
              Loading post…
            </div>
          ) : (
            <BlogPostEditor
              post={post}
              onBack={onClose}
              onCreated={onCreated}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// --------------- Page editor workspace ---------------
function PageEditorWorkspace({
  target,
  onClose,
  onCreated,
}: {
  target: { mode: "new" } | { mode: "edit"; pageId: string };
  onClose: () => void;
  onCreated: (page: TenantPageModel) => void;
}) {
  const pageQuery = useTenantPage(
    target.mode === "edit" ? target.pageId : null,
  );
  const page = target.mode === "edit" ? (pageQuery.data ?? null) : null;
  const loading = target.mode === "edit" && pageQuery.isLoading;

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden min-h-0">
      <div className="h-11 border-b border-border bg-card flex items-center gap-2 px-3 shrink-0">
        <button
          onClick={onClose}
          className="h-7 px-2 rounded hover:bg-muted text-[12px] text-foreground/80 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft size={12} />
          Back to pages
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <div className="text-[13px] font-semibold text-foreground">
          {target.mode === "new" ? "New custom page" : "Edit page details"}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {loading ? (
            <div className="text-center py-16 text-[13px] text-muted-foreground/60">
              Loading page…
            </div>
          ) : (
            <TenantPageEditor
              page={page}
              onBack={onClose}
              onCreated={onCreated}
              disablePreview
            />
          )}
        </div>
      </div>
    </div>
  );
}

// --------------- Confetti overlay (CSS-only, fires once per mount) ---------------
const CONFETTI_COLORS = [
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#ef4444", // red
  "#14b8a6", // teal
];

function Confetti({ pieceCount = 36 }: { pieceCount?: number }) {
  // Generate deterministic-per-mount particle configs.
  const pieces = useMemo(
    () =>
      Array.from({ length: pieceCount }, (_, i) => {
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length]!;
        const left = Math.random() * 100;
        const delay = Math.random() * 0.2;
        const duration = 1.4 + Math.random() * 0.9;
        const drift = (Math.random() - 0.5) * 160; // -80 to 80 px
        const rotate = Math.random() * 720 - 360;
        const shape = i % 3; // 0 square, 1 rect, 2 circle
        const size = 6 + Math.random() * 6;
        return { i, color, left, delay, duration, drift, rotate, shape, size };
      }),
    [pieceCount],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[95] overflow-hidden">
      <style>{`
        @keyframes site-editor-confetti {
          0% {
            transform: translate3d(0, -10vh, 0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate3d(var(--drift, 0), 105vh, 0) rotate(var(--rot, 180deg));
            opacity: 0.6;
          }
        }
      `}</style>
      {pieces.map((p) => (
        <span
          key={p.i}
          aria-hidden="true"
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: 0,
            width: p.shape === 1 ? p.size * 1.6 : p.size,
            height: p.shape === 2 ? p.size : p.size,
            borderRadius: p.shape === 2 ? "9999px" : "2px",
            background: p.color,
            ["--drift" as string]: `${p.drift}px`,
            ["--rot" as string]: `${p.rotate}deg`,
            animation: `site-editor-confetti ${p.duration}s cubic-bezier(.2,.6,.4,1) ${p.delay}s forwards`,
            willChange: "transform, opacity",
          }}
        />
      ))}
    </div>
  );
}

// --------------- Floating block-action toolbar ---------------
function BlockActionToolbar({
  blocks,
  selectedId,
  onOpenMenu,
}: {
  blocks: BlockNode[];
  selectedId: string | null;
  onOpenMenu: (blockId: string, x: number, y: number) => void;
}) {
  const setSelected = useEditorStore((s) => s.setSelected);
  const moveBlock = useEditorStore((s) => s.moveBlock);
  const duplicateBlock = useEditorStore((s) => s.duplicateBlock);
  const removeBlock = useEditorStore((s) => s.removeBlock);

  if (!selectedId) return null;
  const idx = blocks.findIndex((b) => b.id === selectedId);
  if (idx < 0) return null;
  const block = blocks[idx]!;
  const entry = BLOCK_CATALOG.find((c) => c.kind === block.kind);
  const canMoveUp = idx > 0;
  const canMoveDown = idx < blocks.length - 1;

  return (
    <div
      className="sticky top-3 z-20 mx-auto w-fit animate-in fade-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-0.5 rounded-lg border border-border bg-card/95 backdrop-blur px-1 py-1 shadow-lg">
        <div className="px-2 py-0.5 flex items-center gap-1.5 text-[11.5px] font-medium text-foreground">
          <Box size={11} className="text-muted-foreground/70" />
          {entry?.label ?? block.kind}
        </div>
        <div className="w-px h-5 bg-border mx-1" />
        <button
          onClick={() => moveBlock(selectedId, -1)}
          disabled={!canMoveUp}
          title="Move up"
          className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronUp size={13} />
        </button>
        <button
          onClick={() => moveBlock(selectedId, 1)}
          disabled={!canMoveDown}
          title="Move down"
          className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronDown size={13} />
        </button>
        <button
          onClick={() => duplicateBlock(selectedId)}
          title="Duplicate (⌘D)"
          className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Copy size={12} />
        </button>
        <button
          onClick={() => removeBlock(selectedId)}
          title="Delete (⌫)"
          className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <Trash2 size={12} />
        </button>
        <button
          onClick={(e) => {
            const rect = (
              e.currentTarget as HTMLElement
            ).getBoundingClientRect();
            onOpenMenu(selectedId, rect.left, rect.bottom + 4);
          }}
          title="More actions"
          className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <MoreHorizontal size={13} />
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <button
          onClick={() => setSelected(null)}
          title="Deselect (Esc)"
          className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface SiteEditorPageProps {
  /** When true, renders as a full h-screen editor (no admin shell). */
  fullScreen?: boolean;
}

export function SiteEditorPage({ fullScreen = false }: SiteEditorPageProps) {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ---- Target (scope + optional pageId) ----
  const initialTarget: EditorTarget = useMemo(() => {
    const rawScope = searchParams.get("scope");
    const rawPageId = searchParams.get("pageId");
    if (rawScope === "page" && rawPageId)
      return { scope: "page", pageId: rawPageId };
    if (rawScope && BUILT_IN_SCOPES.some((s) => s.value === rawScope))
      return { scope: rawScope as SiteLayoutScope, pageId: null };
    return { scope: "home", pageId: null };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [target, setTarget] = useState<EditorTarget>(initialTarget);
  const { scope, pageId } = target;

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("scope", scope);
    if (pageId) params.set("pageId", pageId);
    else params.delete("pageId");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, pageId]);

  // ---- Editor UI state ----
  const [activePanel, setActivePanel] = useState<PanelId>("pages");
  const [device, setDevice] = useState<DeviceKey>("desktop");
  const [zoom, setZoom] = useState(1);
  const [publishOpen, setPublishOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // ---- Publish success flash ----
  const [publishFlash, setPublishFlash] = useState(false);

  // ---- Block context menu (right-click on Layers rows, triangle on floating toolbar) ----
  const [blockMenu, setBlockMenu] = useState<BlockMenuState>(null);
  const openBlockMenu = useCallback((blockId: string, x: number, y: number) => {
    setBlockMenu({ blockId, x, y });
  }, []);

  // ---- Palette drag-ghost chip (single DOM node, reused across all palette cards) ----
  const dragChipRef = useRef<HTMLDivElement | null>(null);

  // ---- Workspace takeover (blog / page editor modes) ----
  type BlogEditorTarget =
    | { mode: "new" }
    | { mode: "edit"; postId: string }
    | null;
  type PageEditorTarget =
    | { mode: "new" }
    | { mode: "edit"; pageId: string }
    | null;
  const [blogEditor, setBlogEditor] = useState<BlogEditorTarget>(null);
  const [pageEditor, setPageEditor] = useState<PageEditorTarget>(null);
  const workspaceMode: "canvas" | "blog" | "page" = blogEditor
    ? "blog"
    : pageEditor
      ? "page"
      : "canvas";

  // ---- PDP product picker ----
  const [previewProductId, setPreviewProductId] = useState<string | null>(null);
  const pdpProductsQuery = useProductsPaginated({ page: 1, limit: 50 });
  const pdpProducts = useMemo(
    () => pdpProductsQuery.data?.data ?? [],
    [pdpProductsQuery.data?.data],
  );
  useEffect(() => {
    if (scope !== "product-detail" || previewProductId || !pdpProducts[0])
      return;
    setPreviewProductId(pdpProducts[0].id);
  }, [scope, previewProductId, pdpProducts]);

  // ---- Data queries ----
  const layoutQuery = useSiteLayout(scope, pageId ?? undefined);
  const previewUrlQuery = useSiteLayoutPreviewUrl(scope, pageId ?? undefined);
  const saveDraft = useUpsertSiteLayoutDraft();
  const publish = usePublishSiteLayout();
  const _resetFromTemplate = useResetSiteLayoutFromTemplate();
  const configQuery = useSiteConfig();
  const tenantId = configQuery.data?.tenantId ?? null;
  const pagesQuery = useTenantPages({ limit: 100 });
  const customPages = useMemo(
    () => pagesQuery.data?.pages ?? [],
    [pagesQuery.data?.pages],
  );

  // ---- Store ----
  const load = useEditorStore((s) => s.load);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canUndo = useEditorStore((s) => s.canUndo());
  const canRedo = useEditorStore((s) => s.canRedo());
  const addBlockToStore = useEditorStore((s) => s.addBlock);
  const blocks = useEditorStore(selectBlocks);
  const dirty = useEditorStore(selectDirty);
  const selectedId = useEditorStore(selectSelectedId);
  const markClean = useEditorStore((s) => s.markClean);
  const setSelected = useEditorStore((s) => s.setSelected);

  // ---- Load layout ----
  useEffect(() => {
    if (layoutQuery.isLoading) return;
    const row = layoutQuery.data;
    const source =
      row?.draftBlocks && Array.isArray(row.draftBlocks)
        ? (row.draftBlocks as BlockNode[])
        : row?.blocks && Array.isArray(row.blocks)
          ? (row.blocks as BlockNode[])
          : [];
    load(source);
  }, [scope, layoutQuery.data, layoutQuery.isLoading, load]);

  // ---- Autosave ----
  const [autosaveEnabled, _setAutosaveEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("site-editor-autosave") !== "false";
  });
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveRef = useRef(handleSaveDraftSilent);
  autosaveRef.current = handleSaveDraftSilent;

  useEffect(() => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    if (!autosaveEnabled || !dirty) return;
    autosaveTimerRef.current = setTimeout(() => autosaveRef.current(), 30_000);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [autosaveEnabled, dirty, blocks]);

  // ---- Saved-ago display ----
  const [savedAt, setSavedAt] = useState(new Date());
  const savedAgo = useMemo(() => {
    const s = Math.floor((Date.now() - savedAt.getTime()) / 1000);
    if (dirty) return "Unsaved";
    if (s < 5) return "Saved";
    if (s < 60) return `${s}s ago`;
    return `${Math.floor(s / 60)}m ago`;
  }, [savedAt, dirty]);

  // ---- Add block ----
  const handleAddBlock = useCallback(
    (kind: string) => {
      const entry = BLOCK_CATALOG.find((b) => b.kind === kind);
      if (!entry) return;
      const id = makeBlockId();
      const node: BlockNode = {
        id,
        kind: entry.kind,
        props: entry.createDefaultProps() as BlockNode["props"],
      };
      addBlockToStore(node);
      pushRecentBlock(kind);
      toast({ title: `Added ${entry.label}` });
    },
    [addBlockToStore, toast],
  );

  // ---- Inline text edit (double-click on canvas) ----
  const updateBlockPropsAction = useEditorStore((s) => s.updateBlockProps);
  const handleInlineEdit = useCallback(
    (blockId: string, field: string, value: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updateBlockPropsAction(blockId, { [field]: value } as any);
    },
    [updateBlockPropsAction],
  );

  // ---- Canvas drag reorder + palette drop-in ----
  const moveBlockToAction = useEditorStore((s) => s.moveBlockTo);
  const handleReorder = useCallback(
    (blockId: string, toIndex: number) => {
      moveBlockToAction(blockId, toIndex);
    },
    [moveBlockToAction],
  );
  const handleInsertAt = useCallback(
    (kind: string, atIndex: number) => {
      const entry = BLOCK_CATALOG.find((b) => b.kind === kind);
      if (!entry) return;
      const id = makeBlockId();
      const node: BlockNode = {
        id,
        kind: entry.kind,
        props: entry.createDefaultProps() as BlockNode["props"],
      };
      addBlockToStore(node, atIndex);
      pushRecentBlock(kind);
      toast({ title: `Added ${entry.label}` });
    },
    [addBlockToStore, toast],
  );

  // ---- Save / publish ----
  function handleSaveDraftSilent() {
    saveDraft
      .mutateAsync({ scope, pageId, blocks })
      .then(() => {
        markClean();
        setSavedAt(new Date());
        setRefreshKey((k) => k + 1);
        toast({ title: "Autosaved" });
      })
      .catch(() => {
        toast({
          title: "Autosave failed",
          variant: "destructive",
        });
      });
  }

  const handleSaveDraft = async () => {
    try {
      await saveDraft.mutateAsync({ scope, pageId, blocks });
      markClean();
      setSavedAt(new Date());
      setRefreshKey((k) => k + 1);
      toast({ title: "Draft saved" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
  };

  const handlePublish = async () => {
    try {
      await saveDraft.mutateAsync({ scope, pageId, blocks });
      await publish.mutateAsync({ scope, ...(pageId ? { pageId } : {}) });
      markClean();
      setSavedAt(new Date());
      setRefreshKey((k) => k + 1);
      setPublishOpen(false);
      setPublishFlash(true);
      window.setTimeout(() => setPublishFlash(false), 2600);
      toast({ title: "Published successfully" });
    } catch {
      toast({ title: "Publish failed", variant: "destructive" });
    }
  };

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (quickAddOpen || publishOpen || shortcutsOpen) return;
      const isEditing = (e.target as HTMLElement).matches(
        "input, textarea, [contenteditable=true]",
      );

      // When the blog/page editor has taken over the canvas, ignore block-editor
      // shortcuts (⌘K, ⌘S, ⌘↵, undo/redo, rail keys). Escape is handled below
      // and closes the workspace.
      const inWorkspace = !!blogEditor || !!pageEditor;
      if (inWorkspace) {
        if (!isEditing && e.key === "Escape") {
          e.preventDefault();
          if (blogEditor) setBlogEditor(null);
          else if (pageEditor) setPageEditor(null);
        }
        return;
      }

      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuickAddOpen(true);
      } else if (meta && e.key === "Enter") {
        e.preventDefault();
        setPublishOpen(true);
      } else if (meta && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveDraft();
      } else if (meta && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        meta &&
        ((e.key.toLowerCase() === "z" && e.shiftKey) ||
          e.key.toLowerCase() === "y")
      ) {
        e.preventDefault();
        redo();
      } else if (!isEditing) {
        if (e.key === "Escape") setSelected(null);
        else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
          e.preventDefault();
          useEditorStore.getState().removeBlock(selectedId);
        } else if (meta && e.key.toLowerCase() === "d" && selectedId) {
          e.preventDefault();
          useEditorStore.getState().duplicateBlock(selectedId);
        } else if (e.key === "?") {
          e.preventDefault();
          setShortcutsOpen(true);
        } else {
          const railItem = RAIL.find((r) => r.kbd === e.key);
          if (railItem) setActivePanel(railItem.id);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, quickAddOpen, publishOpen, shortcutsOpen, undo, redo]);

  // ---- Canvas drag-drop from blocks panel ----
  const onCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const kind = e.dataTransfer.getData("block-kind");
    if (kind) handleAddBlock(kind);
  };

  // ---- Preview URL ----
  const previewUrl = previewUrlQuery.data ?? null;
  const previewLoading =
    previewUrlQuery.isLoading || previewUrlQuery.isFetching;

  // ---- Scope label ----
  const scopeLabel =
    scope === "page"
      ? (customPages.find((p) => p.id === pageId)?.title ?? "Custom page")
      : (BUILT_IN_SCOPES.find((s) => s.value === scope)?.label ?? scope);

  // ---- Panel renderer ----
  const WIDE_PANELS: PanelId[] = [
    "overview",
    "branding",
    "theme",
    "nav",
    "seo",
    "contact",
    "domain",
  ];
  const panelWidth = WIDE_PANELS.includes(activePanel) ? "w-[480px]" : "w-72";

  const renderPanel = () => {
    const cfg = configQuery.data;
    switch (activePanel) {
      case "pages":
        return (
          <PagesPanel
            target={target}
            setTarget={setTarget}
            customPages={customPages.map((p) => ({ id: p.id, title: p.title }))}
            onNewCustomPage={() => setPageEditor({ mode: "new" })}
            onEditPageDetails={(pageId) =>
              setPageEditor({ mode: "edit", pageId })
            }
          />
        );
      case "blocks":
        return <BlocksPanel onAdd={handleAddBlock} dragChipRef={dragChipRef} />;
      case "layers":
        return (
          <LayersPanel
            blocks={blocks}
            selectedId={selectedId}
            onContextMenu={openBlockMenu}
          />
        );
      case "media":
        return <MediaPanel />;
      case "overview":
        return cfg ? (
          <OverviewPanel config={cfg} onGoToPanel={setActivePanel} />
        ) : null;
      case "branding":
        return cfg ? <BrandingPanel config={cfg} /> : null;
      case "theme":
        return cfg ? <ThemePanel config={cfg} /> : null;
      case "nav":
        return <NavPanel />;
      case "seo":
        return cfg ? <SEOPanel config={cfg} /> : null;
      case "contact":
        return cfg ? <ContactPanel config={cfg} /> : null;
      case "domain":
        return <DomainPanel tenantId={tenantId} />;
      case "blog":
        return (
          <BlogPanel
            onNew={() => setBlogEditor({ mode: "new" })}
            onEdit={(postId) => setBlogEditor({ mode: "edit", postId })}
          />
        );
    }
  };

  // ---- Shell ----
  const shell = (
    <div
      className="flex flex-col overflow-hidden bg-background"
      style={{ height: fullScreen ? "100dvh" : "calc(100vh - 4rem)" }}
    >
      {/* ── Top bar ── */}
      <div className="h-12 border-b border-border bg-card flex items-center gap-2 px-3 shrink-0 z-20">
        {/* Site breadcrumb */}
        <div className="flex items-center gap-1.5 mr-1 min-w-0">
          <div className="h-7 w-7 rounded-md grid place-items-center bg-muted shrink-0">
            <Globe size={14} className="text-foreground/80" />
          </div>
          <div className="flex items-center gap-1 min-w-0 text-[12.5px]">
            <span className="font-semibold text-foreground truncate max-w-[160px]">
              {(configQuery.data?.branding as { name?: string } | null)?.name ??
                "Your site"}
            </span>
            <ChevronRight
              size={12}
              className="text-muted-foreground/60 shrink-0"
            />
            <button
              onClick={() => setActivePanel("pages")}
              className="flex items-center gap-1 h-7 px-1.5 rounded hover:bg-muted text-foreground/90 font-medium transition-colors truncate"
              title="Switch page"
            >
              <Hash size={11} className="text-muted-foreground/70 shrink-0" />
              <span className="truncate">{scopeLabel}</span>
              <ChevronDown
                size={11}
                className="text-muted-foreground/60 shrink-0"
              />
            </button>
          </div>
        </div>

        <Divider vertical />

        {/* Undo / redo */}
        <div className="flex items-center gap-0.5">
          <IconBtn tooltip="Undo (⌘Z)" disabled={!canUndo} onClick={undo}>
            <Undo2 size={13} />
          </IconBtn>
          <IconBtn tooltip="Redo (⌘⇧Z)" disabled={!canRedo} onClick={redo}>
            <Redo2 size={13} />
          </IconBtn>
        </div>

        <Divider vertical />

        {/* Save-state chip */}
        <div
          className={cn(
            "hidden md:flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium transition-colors",
            saveDraft.isPending
              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
              : dirty
                ? "bg-muted text-muted-foreground"
                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              saveDraft.isPending
                ? "bg-amber-500 animate-pulse"
                : dirty
                  ? "bg-muted-foreground/60"
                  : "bg-emerald-500",
            )}
          />
          {saveDraft.isPending
            ? "Saving…"
            : dirty
              ? "Unsaved changes"
              : savedAgo === "Saved" || savedAgo === "Unsaved"
                ? "All changes saved"
                : `Saved · ${savedAgo}`}
        </div>

        <div className="flex-1" />

        {/* Device switcher */}
        <div className="flex items-center bg-muted rounded-md p-0.5 gap-0.5">
          {(
            Object.entries(DEVICES) as [
              DeviceKey,
              {
                w: number;
                label: string;
                icon: React.ComponentType<{ size?: number }>;
              },
            ][]
          ).map(([k, d]) => {
            const DevIcon = d.icon;
            return (
              <button
                key={k}
                onClick={() => setDevice(k)}
                title={`${d.label} · ${d.w}px`}
                className={cn(
                  "h-7 w-9 grid place-items-center rounded transition-colors",
                  device === k
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <DevIcon size={13} />
              </button>
            );
          })}
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-0.5">
          <IconBtn
            tooltip="Zoom out"
            onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(1)))}
          >
            <ZoomOut size={13} />
          </IconBtn>
          <button
            onClick={() => setZoom(1)}
            className="h-7 px-2 rounded text-[11px] font-mono text-muted-foreground hover:bg-muted transition-colors"
          >
            {Math.round(zoom * 100)}%
          </button>
          <IconBtn
            tooltip="Zoom in"
            onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(1)))}
          >
            <ZoomIn size={13} />
          </IconBtn>
        </div>

        <Divider vertical />

        {/* Quick-add */}
        <button
          onClick={() => setQuickAddOpen(true)}
          className="flex items-center gap-1.5 h-7 px-2.5 rounded bg-muted hover:bg-muted/80 text-[12px] text-muted-foreground transition-colors"
        >
          <Search size={11} />
          <span className="hidden lg:inline">Quick add</span>
          <kbd className="hidden lg:inline text-[10px] px-1 py-0.5 rounded border border-border bg-card text-muted-foreground/60 font-mono">
            ⌘K
          </kbd>
        </button>

        <IconBtn
          tooltip="Keyboard shortcuts (?)"
          onClick={() => setShortcutsOpen(true)}
        >
          <Keyboard size={13} />
        </IconBtn>

        {/* Preview + Publish group */}
        <div className="flex items-center gap-1 ml-1">
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 px-3 rounded-md border border-border text-[12px] font-medium text-foreground/80 hover:bg-muted/50 flex items-center gap-1.5 transition-colors"
            >
              <Eye size={12} />
              Preview
            </a>
          )}
          <button
            onClick={() => setPublishOpen(true)}
            className="h-8 px-3.5 rounded-md text-[12.5px] font-semibold text-white flex items-center gap-1.5 shadow-sm hover:shadow-md hover:brightness-105 transition-all"
            style={{ background: ACCENT }}
          >
            <Rocket size={12} />
            Publish
          </button>
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* ── Icon Rail ── */}
        <div className="w-14 h-full border-r border-border bg-card flex flex-col items-center py-2 gap-1 shrink-0">
          {RAIL.map((item) => {
            const ItemIcon = item.Icon;
            return (
              <div key={item.id} className="contents">
                {item.dividerBefore && (
                  <div className="h-px bg-border w-8 my-0.5" />
                )}
                <button
                  title={`${item.label} (${item.kbd})`}
                  onClick={() => setActivePanel(item.id)}
                  className={cn(
                    "h-10 w-10 rounded-lg grid place-items-center transition-colors relative",
                    activePanel === item.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground/60 hover:bg-muted hover:text-foreground",
                  )}
                >
                  <ItemIcon size={18} />
                </button>
              </div>
            );
          })}
          <div className="flex-1" />
          {/* Publish at bottom of rail */}
          <button
            title="Publish (⌘↵)"
            onClick={() => setPublishOpen(true)}
            className="h-10 w-10 rounded-lg grid place-items-center text-white shadow-sm hover:opacity-90 transition-opacity"
            style={{ background: ACCENT }}
          >
            <Rocket size={18} />
          </button>
        </div>

        {workspaceMode === "canvas" ? (
          <>
            {/* ── Secondary panel ── */}
            <div
              className={cn(
                panelWidth,
                "border-r border-border bg-card shrink-0 overflow-hidden flex flex-col transition-[width] duration-150",
              )}
            >
              {renderPanel()}
            </div>

            {/* ── Canvas ── */}
            <div
              className="flex-1 overflow-auto relative"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
                backgroundColor: "oklch(0.95 0.008 95)",
              }}
              onClick={() => setSelected(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onCanvasDrop}
            >
              <BlockActionToolbar
                blocks={blocks}
                selectedId={selectedId}
                onOpenMenu={openBlockMenu}
              />
              <div className="min-h-full py-8 px-6 flex flex-col items-center">
                <div
                  className="origin-top transition-transform"
                  style={{
                    transform: `scale(${zoom})`,
                    width: DEVICES[device].w,
                    transformOrigin: "top center",
                  }}
                >
                  <div className="bg-card shadow-xl rounded-md overflow-hidden border border-border">
                    {blocks.length === 0 ? (
                      <div
                        className="py-24 px-8 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="relative mx-auto mb-4 h-16 w-16">
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 blur-lg" />
                          <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-muted to-muted/50 border border-border grid place-items-center">
                            <Box
                              size={26}
                              className="text-muted-foreground/60"
                            />
                          </div>
                        </div>
                        <div className="text-[15px] font-semibold text-foreground mb-1">
                          Empty {scopeLabel.toLowerCase()}
                        </div>
                        <div className="text-[12.5px] text-muted-foreground/80 mb-5 max-w-[320px] mx-auto">
                          Drag blocks from the panel, or press{" "}
                          <kbd className="text-[11px] px-1.5 py-0.5 rounded border border-border bg-card font-mono">
                            ⌘K
                          </kbd>{" "}
                          to search the catalog.
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePanel("blocks");
                            }}
                            className="h-8 px-3.5 rounded-md text-[12.5px] font-semibold text-white flex items-center gap-1.5"
                            style={{ background: ACCENT }}
                          >
                            <Plus size={12} />
                            Add block
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuickAddOpen(true);
                            }}
                            className="h-8 px-3 rounded-md border border-border text-[12px] font-medium text-foreground/80 hover:bg-muted/50 flex items-center gap-1.5"
                          >
                            <Search size={12} />
                            Quick add
                          </button>
                        </div>
                      </div>
                    ) : (
                      <PreviewFrame
                        previewUrl={previewUrl}
                        loading={previewLoading}
                        refreshKey={refreshKey}
                        onRefresh={() => setRefreshKey((k) => k + 1)}
                        device={device}
                        onDeviceChange={setDevice}
                        productId={
                          scope === "product-detail" ? previewProductId : null
                        }
                        selectedId={selectedId}
                        onBlockSelect={setSelected}
                        onInlineEdit={handleInlineEdit}
                        onReorder={handleReorder}
                        onInsertAt={handleInsertAt}
                      />
                    )}
                  </div>
                  <div className="text-center pt-2 pb-1 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider">
                    {device} · {DEVICES[device].w}px · {Math.round(zoom * 100)}%
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right inspector ── */}
            <div className="w-80 border-l border-border bg-card shrink-0 overflow-hidden flex flex-col">
              <BlockInspector />
            </div>
          </>
        ) : workspaceMode === "blog" && blogEditor ? (
          <BlogEditorWorkspace
            target={blogEditor}
            onClose={() => setBlogEditor(null)}
            onCreated={(post) =>
              setBlogEditor({ mode: "edit", postId: post.id })
            }
          />
        ) : workspaceMode === "page" && pageEditor ? (
          <PageEditorWorkspace
            target={pageEditor}
            onClose={() => setPageEditor(null)}
            onCreated={(page) =>
              setPageEditor({ mode: "edit", pageId: page.id })
            }
          />
        ) : null}
      </div>

      {/* Modals */}
      <QuickAddBar
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onAdd={handleAddBlock}
        scope={scope}
      />
      <PublishModal
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        onConfirm={handlePublish}
        dirty={dirty}
        isPending={publish.isPending}
      />
      <ShortcutsModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      {/* Block context menu */}
      <BlockContextMenu
        state={blockMenu}
        blocks={blocks}
        onClose={() => setBlockMenu(null)}
      />

      {/* Offscreen palette drag-ghost chip */}
      <BlockDragChip chipRef={dragChipRef} />

      {/* Publish success flash + confetti */}
      {publishFlash && (
        <>
          <Confetti />
          <div className="pointer-events-none fixed inset-0 z-[96] grid place-items-center">
            <div className="flex items-center gap-2 h-11 px-5 rounded-full bg-emerald-500 text-white shadow-xl animate-in fade-in zoom-in-95 slide-in-from-bottom-3 duration-200">
              <CheckCircle2 size={16} />
              <span className="text-[13px] font-semibold">
                Published to live
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // When not fullScreen, just render the shell (it's embedded in admin layout)
  if (!fullScreen) return shell;

  // fullScreen: rendered outside admin layout, so it naturally fills viewport
  return shell;
}
