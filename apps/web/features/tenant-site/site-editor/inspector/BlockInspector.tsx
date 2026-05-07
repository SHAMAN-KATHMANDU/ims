"use client";

import { useState } from "react";
import { BlockPropsSchemas } from "@repo/shared";
import type { BlockNode } from "@repo/shared";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileText,
  Palette,
  Settings2,
  RotateCcw,
  X,
  ChevronRight,
} from "lucide-react";
import {
  selectSelectedBlock,
  selectSelectedId,
  selectSetSelected,
  selectUpdateBlockProps,
  selectUpdateBlockStyle,
  selectUpdateBlockVisibility,
  useEditorStore,
} from "../store/editor-store";
import { getCatalogEntry } from "../catalog/block-catalog";
import { AutoForm } from "./auto-form/AutoForm";
import { DesignTabContent } from "./design-tab/DesignTabContent";

type InspectorTab = "content" | "design" | "advanced";

interface InspectorTabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
}

function InspectorTabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: InspectorTabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border-b-2 transition-colors ${
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

export function BlockInspector() {
  const selected = useEditorStore(selectSelectedBlock);
  const selectedId = useEditorStore(selectSelectedId);
  const setSelected = useEditorStore(selectSetSelected);
  const updateBlockProps = useEditorStore(selectUpdateBlockProps);
  const updateBlockStyle = useEditorStore(selectUpdateBlockStyle);
  const updateBlockVisibility = useEditorStore(selectUpdateBlockVisibility);
  const [tab, setTab] = useState<InspectorTab>("content");

  // No selection
  if (!selected || !selectedId) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground/80">
            No block selected
          </div>
          <div className="text-xs text-muted-foreground/70 max-w-[200px]">
            Click any block in the preview to edit its properties.
          </div>
        </div>
      </div>
    );
  }

  const entry = getCatalogEntry(selected.kind);
  const schema =
    BlockPropsSchemas[selected.kind as keyof typeof BlockPropsSchemas];

  const handleReset = () => {
    if (!entry) return;
    if (!confirm(`Reset "${entry.label}" to default values?`)) return;
    const defaults = entry.createDefaultProps() as Record<string, unknown>;
    updateBlockProps(selectedId, defaults as Record<string, unknown>);
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border px-3 py-2.5 space-y-2">
        {/* Breadcrumb */}
        <div className="flex items-center gap-0.5 text-[10.5px] text-muted-foreground/70 uppercase tracking-wider font-medium">
          <span>{entry?.category ?? "Block"}</span>
          <ChevronRight size={10} />
          <span className="text-foreground/70">
            {entry?.label ?? selected.kind}
          </span>
        </div>

        {/* Title + actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground leading-tight">
              {entry?.label ?? selected.kind}
            </div>
            {entry?.description && (
              <div className="text-xs text-muted-foreground leading-tight mt-0.5 line-clamp-2">
                {entry.description}
              </div>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleReset}
                  className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <RotateCcw size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Reset to defaults</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setSelected(null)}
                  className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Deselect (Esc)</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border px-2 py-1.5 flex items-center gap-0.5 shrink-0">
        <InspectorTabButton
          active={tab === "content"}
          onClick={() => setTab("content")}
          icon={FileText}
          label="Content"
        />
        <InspectorTabButton
          active={tab === "design"}
          onClick={() => setTab("design")}
          icon={Palette}
          label="Design"
        />
        <InspectorTabButton
          active={tab === "advanced"}
          onClick={() => setTab("advanced")}
          icon={Settings2}
          label="Advanced"
        />
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "content" && schema && (
          <AutoForm
            schema={schema}
            values={selected.props as Record<string, unknown>}
            onChange={(fieldName, value) => {
              updateBlockProps(selectedId, { [fieldName]: value } as Record<
                string,
                unknown
              >);
            }}
            blockKind={selected.kind}
          />
        )}

        {tab === "design" && (
          <DesignTabContent
            block={selected}
            onUpdateStyle={updateBlockStyle}
            onUpdateVisibility={updateBlockVisibility}
            blockId={selectedId}
          />
        )}

        {tab === "advanced" && (
          <AdvancedTabContent block={selected} blockId={selectedId} />
        )}
      </div>
    </div>
  );
}

function AdvancedTabContent({
  block,
  blockId,
}: {
  block: BlockNode;
  blockId: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Block ID
        </label>
        <div className="mt-1 p-2 rounded bg-muted text-xs font-mono text-foreground/70 break-all">
          {blockId}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Block Kind
        </label>
        <div className="mt-1 p-2 rounded bg-muted text-xs font-mono text-foreground/70">
          {block.kind}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Raw JSON
        </label>
        <textarea
          readOnly
          value={JSON.stringify(block, null, 2)}
          className="mt-1 w-full p-2 rounded bg-muted border border-border text-xs font-mono text-foreground/70 resize-none"
          rows={8}
        />
      </div>
    </div>
  );
}
