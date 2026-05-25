"use client";

import type { JSX } from "react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Monitor } from "lucide-react";
import type { BlockNode } from "@repo/shared";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/useMobile";
import { useHideCmsTopbar } from "../hooks/use-breadcrumbs";
import { useEditorStore } from "@/features/tenant-site/site-editor/store/editor-store";
import {
  selectBlocks,
  selectSelectedId,
  selectSetSelected,
  selectAddBlock,
  selectUndo,
  selectRedo,
  selectMoveBlock,
} from "@/features/tenant-site/site-editor/store/selectors";
import { BuilderTopBar } from "./BuilderTopBar";
import { BuilderLayers } from "./BuilderLayers";
import { BuilderProperties } from "./BuilderProperties";
import { BuilderCanvas } from "./BuilderCanvas";
import "../builder-tokens.css";

interface BuilderShellProps {
  workspace: string;
  pageId: string;
}

export function BuilderShell({
  workspace,
  pageId,
}: BuilderShellProps): JSX.Element {
  const router = useRouter();
  const isMobile = useIsMobile();
  useHideCmsTopbar();

  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">(
    "desktop",
  );
  const [_savedAt, _setSavedAt] = useState("just now");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<
    "page" | "block" | "seo" | "history"
  >("page");

  const blocks = useEditorStore(selectBlocks);
  const selectedId = useEditorStore(selectSelectedId);
  const setSelected = useEditorStore(selectSetSelected);
  const addBlock = useEditorStore(selectAddBlock);
  const undo = useEditorStore(selectUndo);
  const redo = useEditorStore(selectRedo);
  const moveBlock = useEditorStore(selectMoveBlock);

  useEffect(() => {
    if (!pageId) {
      router.push(`/${workspace}/site/pages`);
    }
  }, [pageId, router, workspace]);

  const handleDrop = useCallback(
    (fromId: string, toIndex: number) => {
      const fromIndex = blocks.findIndex((b) => b.id === fromId);
      if (fromIndex >= 0) {
        // Simple move: just calculate delta
        const delta = toIndex > fromIndex ? 1 : -1;
        moveBlock(fromId, delta);
      }
    },
    [blocks, moveBlock],
  );

  const handleAddBlock = useCallback(() => {
    const newBlock: BlockNode = {
      id: `block-${crypto.randomUUID().slice(0, 8)}`,
      kind: "rich-text",
      props: {
        text: "",
      } as Record<string, unknown>,
    };
    addBlock(newBlock);
  }, [addBlock]);

  const selectedBlock = blocks.find((b) => b.id === selectedId) || null;

  if (!pageId) {
    return <></>;
  }

  // The builder relies on fixed-width side panels and a desktop-sized canvas,
  // which cannot fit on a phone. Show a notice instead of a broken layout.
  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Monitor
            className="h-8 w-8 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">
            Open the builder on a larger screen
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            The website builder needs more room than a phone can give. Please
            use a tablet or desktop to edit this page.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${workspace}/site/pages`}>Back to pages</Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      data-cms-builder
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-sunken)",
      }}
    >
      <BuilderTopBar
        workspace={workspace}
        pageTitle="Untitled page"
        savedAt={_savedAt}
        device={device}
        onDeviceChange={setDevice}
        onUndo={undo}
        onRedo={redo}
        onHistory={() => setActiveTab("history")}
        onPublish={() => console.log("publish")}
        isDirty={false}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
        }}
      >
        <BuilderLayers
          blocks={blocks}
          selectedId={selectedId}
          draggingId={draggingId}
          dropAt={dropAt}
          onSelect={setSelected}
          onDragStart={setDraggingId}
          onDragEnd={() => {
            setDraggingId(null);
            setDropAt(null);
          }}
          onDragOver={setDropAt}
          onDrop={handleDrop}
        />

        <BuilderCanvas
          blocks={blocks}
          selectedId={selectedId}
          hoveredId={hoveredId}
          device={device}
          onSelect={setSelected}
          onHover={setHoveredId}
          onAddBelow={handleAddBlock}
        />

        <BuilderProperties
          selectedBlock={selectedBlock}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>
    </div>
  );
}
