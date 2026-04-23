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
  Keyboard,
  Plus,
  Layers,
  LayoutGrid,
  Palette,
  Navigation,
  Image,
  FileText,
  Globe,
  ChevronRight,
  ChevronDown,
  Hash,
  LayoutDashboard,
  Sliders,
  Mail,
  Link2,
  CheckCircle2,
  Search,
  Box,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import type { BlockNode, SiteLayoutScope } from "@repo/shared";
import {
  useSiteLayout,
  useUpsertSiteLayoutDraft,
  usePublishSiteLayout,
  useSiteLayoutPreviewUrl,
} from "../hooks/use-site-layouts";
import { useSiteConfig, type SiteConfig } from "../hooks/use-tenant-site";
import { SiteOverviewTab } from "../components/SiteOverviewTab";
import { SiteBrandingForm } from "../components/SiteBrandingForm";
import { SiteTemplatePicker } from "../components/SiteTemplatePicker";
import { ThemeTokensForm } from "../components/ThemeTokensForm";
import { NavMenuPanel } from "../components/NavMenuPanel";
import { SiteSeoForm } from "../components/SiteSeoForm";
import { SiteContactForm } from "../components/SiteContactForm";
import { useTenantPages } from "@/features/tenant-pages";
import { useProductsPaginated } from "@/features/products";
import {
  useEditorStore,
  selectBlocks,
  selectDirty,
  selectSelectedId,
} from "./editor-store";
import { BlockInspector } from "./BlockInspector";
import { PreviewFrame } from "./PreviewFrame";
import { BlockTreePanel } from "./BlockTreePanel";
import { BLOCK_CATALOG } from "./block-catalog";
import { BlocksPanel, BlockDragChip, pushRecentBlock } from "./BlocksPanel";
import { BlockContextMenu, type BlockMenuState } from "./BlockContextMenu";
import { BlockActionToolbar } from "./BlockActionToolbar";
import {
  PagesPanel,
  BUILT_IN_SCOPES,
  type PanelId,
  type EditorTarget,
} from "./PagesPanel";
import { QuickAddBar } from "./QuickAddBar";
import { PublishModal } from "./PublishModal";
import { ShortcutsModal } from "./ShortcutsModal";
import { BlogPanel } from "./BlogPanel";
import { BlogEditorWorkspace } from "./BlogEditorWorkspace";
import { PageEditorWorkspace } from "./PageEditorWorkspace";
import { DomainPanel } from "./DomainPanel";
import { Confetti } from "./Confetti";
import type { BlogPost } from "@/features/tenant-blog";
import type { TenantPage as TenantPageModel } from "@/features/tenant-pages";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEVICES = {
  desktop: { w: 1280, label: "Desktop", icon: Monitor },
  tablet: { w: 834, label: "Tablet", icon: Tablet },
  mobile: { w: 390, label: "Mobile", icon: Smartphone },
} as const;

type DeviceKey = keyof typeof DEVICES;

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

const WIDE_PANELS: PanelId[] = [
  "overview",
  "branding",
  "theme",
  "nav",
  "seo",
  "contact",
  "domain",
];

/** Accent color used across the editor UI */
const ACCENT = "oklch(0.62 0.08 150)";

// ---------------------------------------------------------------------------
// Shared micro-components (too small to extract to separate files)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Thin panel wrapper components (layout shell + delegate to existing components)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBlockId(): string {
  return `blk-${crypto.randomUUID().slice(0, 8)}`;
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

  // ---- Block context menu ----
  const [blockMenu, setBlockMenu] = useState<BlockMenuState>(null);
  const openBlockMenu = useCallback((blockId: string, x: number, y: number) => {
    setBlockMenu({ blockId, x, y });
  }, []);

  // ---- Palette drag-ghost chip ----
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
  const [autosaveEnabled] = useState(() => {
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
        toast({ title: "Autosave failed", variant: "destructive" });
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

  // ---- Derived values ----
  const previewUrl = previewUrlQuery.data ?? null;
  const previewLoading =
    previewUrlQuery.isLoading || previewUrlQuery.isFetching;
  const scopeLabel =
    scope === "page"
      ? (customPages.find((p) => p.id === pageId)?.title ?? "Custom page")
      : (BUILT_IN_SCOPES.find((s) => s.value === scope)?.label ?? scope);
  const panelWidth = WIDE_PANELS.includes(activePanel) ? "w-[480px]" : "w-72";

  // ---- Panel renderer ----
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
            onEditPageDetails={(pid) =>
              setPageEditor({ mode: "edit", pageId: pid })
            }
          />
        );
      case "blocks":
        return <BlocksPanel onAdd={handleAddBlock} dragChipRef={dragChipRef} />;
      case "layers":
        return (
          <BlockTreePanel
            onOpenPalette={() => setActivePanel("blocks")}
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
            onCreated={(post: BlogPost) =>
              setBlogEditor({ mode: "edit", postId: post.id })
            }
          />
        ) : workspaceMode === "page" && pageEditor ? (
          <PageEditorWorkspace
            target={pageEditor}
            onClose={() => setPageEditor(null)}
            onCreated={(page: TenantPageModel) =>
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

  return shell;
}
