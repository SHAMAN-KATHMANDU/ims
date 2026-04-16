"use client";

/**
 * SiteEditorPage — the Framer-lite editor top-level layout.
 *
 * Three panes (tree | preview | inspector) + a header with scope picker,
 * undo/redo, save, publish. Loads the selected scope's SiteLayout into the
 * Zustand store; mutations are local until the user hits "Save draft".
 *
 * The scope picker is dual-mode: built-in scopes (home, products-index, ...)
 * AND custom-page scopes (page:<id>) populated dynamically from the
 * tenant's TenantPage list. Initial scope+pageId can be passed via
 * `?scope=page&pageId=...` so the pages list "Edit with blocks" button
 * deep-links into the right document.
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Undo2,
  Redo2,
  Save,
  Upload,
  ArrowLeft,
  RotateCcw,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/useToast";
import type { BlockNode, SiteLayoutScope } from "@repo/shared";
import {
  useSiteLayout,
  useUpsertSiteLayoutDraft,
  usePublishSiteLayout,
  useSiteLayoutPreviewUrl,
  useResetSiteLayoutFromTemplate,
} from "../hooks/use-site-layouts";
import { useSiteConfig } from "../hooks/use-tenant-site";
import { useTenantPages } from "@/features/tenant-pages/hooks/use-tenant-pages";
import { useEditorStore, selectBlocks, selectDirty } from "./editor-store";
import { BlockTreePanel } from "./BlockTreePanel";
import { BlockInspector } from "./BlockInspector";
import { BlockPalette } from "./BlockPalette";
import { PreviewFrame } from "./PreviewFrame";

const BUILT_IN_SCOPES: {
  value: SiteLayoutScope;
  label: string;
  group?: string;
}[] = [
  { value: "home", label: "Home" },
  { value: "products-index", label: "Products index" },
  { value: "product-detail", label: "Product detail" },
  { value: "blog-index", label: "Blog index" },
  { value: "blog-post", label: "Blog post" },
  { value: "contact", label: "Contact" },
  { value: "404", label: "404 page", group: "System" },
  { value: "landing", label: "Landing page", group: "System" },
];

type DeviceWidth = "desktop" | "tablet" | "mobile";

/**
 * Editor target — what we're currently composing. Built-in scopes have
 * `pageId === null`; custom-page edits use scope="page" + a real pageId.
 * Encoded in the scope picker as either the bare scope string or
 * "page:<pageId>" so the Select can carry both modes in one value.
 */
type EditorTarget = { scope: SiteLayoutScope; pageId: string | null };

function encodeTarget(t: EditorTarget): string {
  return t.scope === "page" && t.pageId ? `page:${t.pageId}` : t.scope;
}

function decodeTarget(value: string): EditorTarget {
  if (value.startsWith("page:")) {
    return { scope: "page", pageId: value.slice("page:".length) };
  }
  return { scope: value as SiteLayoutScope, pageId: null };
}

export function SiteEditorPage() {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initial target from URL search params so the "Edit with blocks"
  // button on the pages list can deep-link.
  const initialTarget: EditorTarget = (() => {
    const rawScope = searchParams.get("scope");
    const rawPageId = searchParams.get("pageId");
    if (rawScope === "page" && rawPageId) {
      return { scope: "page", pageId: rawPageId };
    }
    if (rawScope && BUILT_IN_SCOPES.some((s) => s.value === rawScope)) {
      return { scope: rawScope as SiteLayoutScope, pageId: null };
    }
    return { scope: "home", pageId: null };
  })();

  const [target, setTarget] = useState<EditorTarget>(initialTarget);
  const { scope, pageId } = target;

  // Mirror target state to the URL so refresh + browser-back work.
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("scope", scope);
    if (pageId) {
      params.set("pageId", pageId);
    } else {
      params.delete("pageId");
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, pageId]);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [device, setDevice] = useState<DeviceWidth>("desktop");
  const [refreshKey, setRefreshKey] = useState(0);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const layoutQuery = useSiteLayout(scope, pageId ?? undefined);
  const previewUrlQuery = useSiteLayoutPreviewUrl(scope, pageId ?? undefined);
  const saveDraft = useUpsertSiteLayoutDraft();
  const publish = usePublishSiteLayout();
  const resetFromTemplate = useResetSiteLayoutFromTemplate();
  const configQuery = useSiteConfig();
  const pagesQuery = useTenantPages({ limit: 100 });
  const templateName = configQuery.data?.template?.name ?? null;
  const customPages = pagesQuery.data?.pages ?? [];

  const load = useEditorStore((s) => s.load);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canUndo = useEditorStore((s) => s.canUndo());
  const canRedo = useEditorStore((s) => s.canRedo());
  const blocks = useEditorStore(selectBlocks);
  const dirty = useEditorStore(selectDirty);
  const markClean = useEditorStore((s) => s.markClean);

  // ---- Autosave --------------------------------------------------------
  // When `autosaveEnabled` is true and the editor has been dirty for 30
  // seconds without a manual save, fire an automatic saveDraft. The timer
  // resets on every store mutation (since `dirty` changes identity on each
  // commit). Persist the toggle in localStorage so power users can disable.
  const [autosaveEnabled, setAutosaveEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("site-editor-autosave") !== "false";
  });
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveRef = useRef(handleSaveDraftSilent);
  autosaveRef.current = handleSaveDraftSilent;

  useEffect(() => {
    localStorage.setItem(
      "site-editor-autosave",
      autosaveEnabled ? "true" : "false",
    );
  }, [autosaveEnabled]);

  useEffect(() => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    if (!autosaveEnabled || !dirty) return;
    autosaveTimerRef.current = setTimeout(() => {
      autosaveRef.current();
    }, 30_000);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [autosaveEnabled, dirty, blocks]);

  // Load the layout for the current scope into the store whenever the
  // server data or scope changes. Prefer draftBlocks if present so the
  // editor always starts on the working copy.
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
    // load() clears dirty, so refreshKey bumps when the tree changes source
  }, [scope, layoutQuery.data, layoutQuery.isLoading, load]);

  function handleSaveDraftSilent() {
    saveDraft
      .mutateAsync({ scope, pageId, blocks })
      .then(() => {
        markClean();
        setRefreshKey((k) => k + 1);
        const now = new Date();
        toast({
          title: `Autosaved at ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`,
        });
      })
      .catch(() => {
        toast({
          title: "Autosave failed",
          description: "Your changes are saved locally. Try saving manually.",
          variant: "destructive",
        });
      });
  }

  const handleSaveDraft = async () => {
    try {
      await saveDraft.mutateAsync({ scope, pageId, blocks });
      markClean();
      setRefreshKey((k) => k + 1);
      toast({ title: "Draft saved" });
    } catch (error) {
      toast({
        title: "Save failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handlePublish = async () => {
    try {
      // Always save the current tree before publishing — even if `dirty`
      // is false. The reason: if the tenant has never saved this scope
      // (no SiteLayout row exists yet), publish would 404 with
      // "Layout not found". Saving first guarantees a row exists and is
      // idempotent when blocks haven't changed.
      await saveDraft.mutateAsync({ scope, pageId, blocks });
      await publish.mutateAsync({
        scope,
        ...(pageId ? { pageId } : {}),
      });
      markClean();
      setRefreshKey((k) => k + 1);
      toast({ title: "Layout published" });
    } catch (error) {
      toast({
        title: "Publish failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleResetFromTemplate = async () => {
    if (scope === "page") {
      toast({
        title: "Custom pages have no template default",
        description:
          "Reset only applies to built-in scopes (home, products, ...).",
        variant: "destructive",
      });
      return;
    }
    setResetDialogOpen(true);
  };

  const executeReset = async () => {
    setResetDialogOpen(false);
    try {
      const row = await resetFromTemplate.mutateAsync({ scope });
      const source =
        row?.draftBlocks && Array.isArray(row.draftBlocks)
          ? (row.draftBlocks as BlockNode[])
          : row?.blocks && Array.isArray(row.blocks)
            ? (row.blocks as BlockNode[])
            : [];
      load(source);
      setRefreshKey((k) => k + 1);
      toast({
        title: "Reset to template default",
        description: `${scope} now matches the ${templateName ?? "template"} blueprint.`,
      });
    } catch (error) {
      toast({
        title: "Reset failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  // Keyboard shortcuts: cmd/ctrl+z / cmd/ctrl+shift+z for undo/redo,
  // cmd/ctrl+s for save. Scoped to window so they work even when focus
  // is inside the iframe's parent container (but NOT inside the iframe
  // itself — that's a cross-origin limitation).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        redo();
      } else if (e.key === "s") {
        e.preventDefault();
        handleSaveDraft();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo, redo, blocks, scope]);

  const previewUrl = previewUrlQuery.data ?? null;
  const previewLoading =
    previewUrlQuery.isLoading || previewUrlQuery.isFetching;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-3">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href=".">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div>
              <CardTitle>Design</CardTitle>
              <CardDescription>
                Compose your site with blocks. Save drafts, publish when ready.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={encodeTarget(target)}
              onValueChange={(v) => setTarget(decodeTarget(v))}
            >
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUILT_IN_SCOPES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
                {customPages.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Custom pages
                    </div>
                    {customPages.map((p) => (
                      <SelectItem key={p.id} value={`page:${p.id}`}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
            <Button
              size="icon"
              variant="ghost"
              onClick={undo}
              disabled={!canUndo}
              aria-label="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={redo}
              disabled={!canRedo}
              aria-label="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={autosaveEnabled ? "secondary" : "ghost"}
              onClick={() => setAutosaveEnabled((v) => !v)}
              title={
                autosaveEnabled
                  ? "Autosave is on (saves 30s after last edit)"
                  : "Autosave is off"
              }
              className="text-xs"
            >
              {autosaveEnabled ? "Auto ✓" : "Auto"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleResetFromTemplate}
              disabled={
                resetFromTemplate.isPending || !templateName || scope === "page"
              }
              title={
                scope === "page"
                  ? "Custom pages have no template default to reset from"
                  : templateName
                    ? `Reset this scope to the ${templateName} default`
                    : "Pick a template first"
              }
            >
              <RotateCcw className="mr-1 h-4 w-4" />
              {resetFromTemplate.isPending ? "Resetting…" : "Reset"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={!dirty || saveDraft.isPending}
            >
              <Save className="mr-1 h-4 w-4" />
              {saveDraft.isPending ? "Saving…" : "Save draft"}
            </Button>
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={publish.isPending}
            >
              <Upload className="mr-1 h-4 w-4" />
              {publish.isPending ? "Publishing…" : "Publish"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Editor panes — responsive:
           ≥ 1280px: 3-pane grid (tree | preview | inspector)
           768–1279px: 2-pane (tree | preview); inspector in a slide-over Sheet
           < 768px: stacked with preview filling the viewport; tree + inspector in Sheets */}
      <div className="hidden min-h-0 flex-1 gap-3 xl:grid xl:grid-cols-[260px_1fr_320px]">
        <Card className="overflow-hidden">
          <CardContent className="h-full p-0">
            <BlockTreePanel onOpenPalette={() => setPaletteOpen(true)} />
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="h-full p-0">
            <PreviewFrame
              previewUrl={previewUrl}
              loading={previewLoading}
              refreshKey={refreshKey}
              onRefresh={() => setRefreshKey((k) => k + 1)}
              device={device}
              onDeviceChange={setDevice}
            />
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="h-full p-0">
            <BlockInspector />
          </CardContent>
        </Card>
      </div>

      {/* Tablet: 2-pane with slide-over inspector */}
      <div className="hidden min-h-0 flex-1 gap-3 md:grid md:grid-cols-[240px_1fr] xl:hidden">
        <Card className="overflow-hidden">
          <CardContent className="h-full p-0">
            <BlockTreePanel onOpenPalette={() => setPaletteOpen(true)} />
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="h-full p-0">
            <PreviewFrame
              previewUrl={previewUrl}
              loading={previewLoading}
              refreshKey={refreshKey}
              onRefresh={() => setRefreshKey((k) => k + 1)}
              device={device}
              onDeviceChange={setDevice}
            />
          </CardContent>
        </Card>
      </div>

      {/* Mobile: preview fills, tree + inspector are accessible via buttons */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 md:hidden">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => setPaletteOpen(true)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add block
          </Button>
        </div>
        <Card className="min-h-0 flex-1 overflow-hidden">
          <CardContent className="h-full p-0">
            <PreviewFrame
              previewUrl={previewUrl}
              loading={previewLoading}
              refreshKey={refreshKey}
              onRefresh={() => setRefreshKey((k) => k + 1)}
              device={device}
              onDeviceChange={setDevice}
            />
          </CardContent>
        </Card>
      </div>

      <BlockPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        scope={scope}
      />

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to template default?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset the {scope} layout to the{" "}
              {templateName ?? "template"} default. Any unsaved draft changes on
              this scope will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeReset}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
