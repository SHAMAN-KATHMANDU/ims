"use client";

/**
 * SiteEditorPage — the Framer-lite editor top-level layout.
 *
 * Three panes (tree | preview | inspector) + a header with scope picker,
 * undo/redo, save, publish. Loads the selected scope's SiteLayout into the
 * Zustand store; mutations are local until the user hits "Save draft".
 */

import { useEffect, useState } from "react";
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
import { Undo2, Redo2, Save, Upload, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/useToast";
import type { BlockNode, SiteLayoutScope } from "@repo/shared";
import {
  useSiteLayout,
  useUpsertSiteLayoutDraft,
  usePublishSiteLayout,
  useSiteLayoutPreviewUrl,
} from "../hooks/use-site-layouts";
import { useEditorStore, selectBlocks, selectDirty } from "./editor-store";
import { BlockTreePanel } from "./BlockTreePanel";
import { BlockInspector } from "./BlockInspector";
import { BlockPalette } from "./BlockPalette";
import { PreviewFrame } from "./PreviewFrame";

const EDITABLE_SCOPES: { value: SiteLayoutScope; label: string }[] = [
  { value: "home", label: "Home" },
  { value: "products-index", label: "Products index" },
  { value: "product-detail", label: "Product detail" },
  { value: "blog-index", label: "Blog index" },
  { value: "blog-post", label: "Blog post" },
];

type DeviceWidth = "desktop" | "tablet" | "mobile";

export function SiteEditorPage() {
  const { toast } = useToast();
  const [scope, setScope] = useState<SiteLayoutScope>("home");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [device, setDevice] = useState<DeviceWidth>("desktop");
  const [refreshKey, setRefreshKey] = useState(0);

  const layoutQuery = useSiteLayout(scope);
  const previewUrlQuery = useSiteLayoutPreviewUrl(scope);
  const saveDraft = useUpsertSiteLayoutDraft();
  const publish = usePublishSiteLayout();

  const load = useEditorStore((s) => s.load);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canUndo = useEditorStore((s) => s.canUndo());
  const canRedo = useEditorStore((s) => s.canRedo());
  const blocks = useEditorStore(selectBlocks);
  const dirty = useEditorStore(selectDirty);
  const markClean = useEditorStore((s) => s.markClean);

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

  const handleSaveDraft = async () => {
    try {
      await saveDraft.mutateAsync({ scope, blocks });
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
      if (dirty) {
        // Save before publishing so the published tree matches what the
        // editor is showing.
        await saveDraft.mutateAsync({ scope, blocks });
      }
      await publish.mutateAsync({ scope });
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
              value={scope}
              onValueChange={(v) => setScope(v as SiteLayoutScope)}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EDITABLE_SCOPES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
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

      {/* Three-pane editor */}
      <div className="grid min-h-0 flex-1 grid-cols-[260px_1fr_320px] gap-3">
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

      <BlockPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        scope={scope}
      />
    </div>
  );
}
