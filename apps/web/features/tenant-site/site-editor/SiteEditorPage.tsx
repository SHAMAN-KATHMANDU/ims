"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Rocket, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import type { BlockNode, SiteLayoutScope } from "@repo/shared";
import {
  useSiteLayout,
  useUpsertSiteLayoutDraft,
  usePublishSiteLayout,
  useSiteLayoutPreviewUrl,
} from "../hooks/use-site-layouts";
import { useSiteConfig } from "../hooks/use-tenant-site";
import { useTenantPages } from "@/features/tenant-pages";
import { useProductsPaginated } from "@/features/products";
import {
  selectAddBlock,
  selectBlocks,
  selectDirty,
  selectLoad,
  selectMarkClean,
  selectMoveBlockTo,
  selectRedo,
  selectSelectedId,
  selectSetSelected,
  selectUndo,
  selectUpdateBlockProps,
  useEditorStore,
} from "./editor-store";
import { BlockInspector } from "./BlockInspector";
import { PreviewFrame } from "./PreviewFrame";
import { BlockTreePanel } from "./BlockTreePanel";
import { BLOCK_CATALOG } from "./block-catalog";
import { BlocksPanel, BlockDragChip, pushRecentBlock } from "./BlocksPanel";
import { BlockContextMenu, type BlockMenuState } from "./BlockContextMenu";
import { BlockActionToolbar } from "./BlockActionToolbar";
import { PagesPanel, BUILT_IN_SCOPES } from "./PagesPanel";
import { QuickAddBar } from "./QuickAddBar";
import { PublishModal } from "./PublishModal";
import { ShortcutsModal } from "./ShortcutsModal";
import { BlogPanel } from "./BlogPanel";
import { BlogEditorWorkspace } from "./BlogEditorWorkspace";
import { PageEditorWorkspace } from "./PageEditorWorkspace";
import { DomainPanel } from "./DomainPanel";
import { Confetti } from "./Confetti";
import { EditorTopBar } from "./EditorTopBar";
import { EmptyCanvas } from "./EmptyCanvas";
import {
  OverviewPanel,
  BrandingPanel,
  ThemePanel,
  NavPanel,
  SEOPanel,
  ContactPanel,
  MediaPanel,
} from "./SitePanels";
import {
  DEVICES,
  WIDE_PANELS,
  RAIL,
  ACCENT,
  type DeviceKey,
} from "./editor-config";
import type { PanelId, EditorTarget } from "./types";
import type { BlogPost } from "@/features/tenant-blog";
import type { TenantPage as TenantPageModel } from "@/features/tenant-pages";

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
  const load = useEditorStore(selectLoad);
  const undo = useEditorStore(selectUndo);
  const redo = useEditorStore(selectRedo);
  const addBlockToStore = useEditorStore(selectAddBlock);
  const blocks = useEditorStore(selectBlocks);
  const dirty = useEditorStore(selectDirty);
  const selectedId = useEditorStore(selectSelectedId);
  const markClean = useEditorStore(selectMarkClean);
  const setSelected = useEditorStore(selectSetSelected);

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
  const updateBlockPropsAction = useEditorStore(selectUpdateBlockProps);
  const handleInlineEdit = useCallback(
    (blockId: string, field: string, value: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updateBlockPropsAction(blockId, { [field]: value } as any);
    },
    [updateBlockPropsAction],
  );

  // ---- Canvas drag reorder + palette drop-in ----
  const moveBlockToAction = useEditorStore(selectMoveBlockTo);
  const handleReorder = useCallback(
    (blockId: string, toIndex: number) => moveBlockToAction(blockId, toIndex),
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
  const siteName =
    (configQuery.data?.branding as { name?: string } | null)?.name ??
    "Your site";

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

  return (
    <div
      className="flex flex-col overflow-hidden bg-background"
      style={{ height: fullScreen ? "100dvh" : "calc(100vh - 4rem)" }}
    >
      {/* ── Top bar ── */}
      <EditorTopBar
        siteName={siteName}
        scopeLabel={scopeLabel}
        setActivePanel={setActivePanel}
        isPendingSave={saveDraft.isPending}
        savedAgo={savedAgo}
        device={device}
        setDevice={setDevice}
        zoom={zoom}
        setZoom={setZoom}
        setQuickAddOpen={setQuickAddOpen}
        setShortcutsOpen={setShortcutsOpen}
        previewUrl={previewUrl}
        setPublishOpen={setPublishOpen}
      />

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
            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- site-editor canvas; click-to-deselect, drag-drop surface; keyboard shortcuts handled globally */}
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
                      <EmptyCanvas
                        scopeLabel={scopeLabel}
                        setActivePanel={setActivePanel}
                        setQuickAddOpen={setQuickAddOpen}
                      />
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
}
