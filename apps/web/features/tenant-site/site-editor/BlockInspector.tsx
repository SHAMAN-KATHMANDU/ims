"use client";

/**
 * BlockInspector — right pane of the editor.
 *
 * Renders an editable form for the selected block's props. The form is
 * derived from the Zod schema in @repo/shared's BlockPropsSchemas, so adding
 * a new block kind automatically gets an inspector UI as long as the schema
 * stays within our supported primitives.
 *
 * Supported field types:
 *   - z.string() -> <Input>
 *   - z.string() with long max -> <Textarea>
 *   - z.number() -> <Input type="number">
 *   - z.boolean() -> <Switch>
 *   - z.enum() / z.literal union -> <Select>
 *   - z.array(z.object()) -> repeater with per-row fields
 *   - z.array(z.string()) -> comma-separated list in <Input>
 *
 * Anything the mapper can't introspect falls back to a raw JSON editor.
 * This is the Phase 4 floor — we extend it as new block shapes land.
 */

import { Component, useMemo, useState, type ReactNode } from "react";
import { z } from "zod";
import { BlockPropsSchemas } from "@repo/shared";
import type { BlockNode } from "@repo/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trash2,
  Plus,
  ChevronRight,
  RotateCcw,
  X,
  FileText,
  Palette,
  Settings2,
  Info,
} from "lucide-react";
import {
  selectSelectedBlock,
  selectSelectedId,
  selectSetSelected,
  selectUpdateBlockId,
  selectUpdateBlockProps,
  selectUpdateBlockStyle,
  selectUpdateBlockVisibility,
  useEditorStore,
} from "./editor-store";
import { getCatalogEntry } from "./block-catalog";
import { ProductPickerField } from "./ProductPickerField";
import { CategoryPickerField } from "./CategoryPickerField";
import { MediaPickerField, type MediaPurpose } from "@/features/media";
import { isImageFieldName } from "./image-fields";
import {
  CUSTOM_INSPECTOR_KINDS,
  CustomInspectorPanel,
  HeaderPseudoInspector,
  FooterPseudoInspector,
} from "./HeaderFooterInspectors";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getFieldOverride } from "./inspector-overrides";

type InspectorTab = "content" | "design" | "advanced";

const FIELD_NAME_TO_PURPOSE: Record<string, MediaPurpose> = {
  logoUrl: "logo",
  logoSrc: "logo",
  brandLogoUrl: "logo",
  faviconUrl: "favicon",
  heroImage: "hero",
  heroImageUrl: "hero",
  coverImage: "cover",
  coverImageUrl: "cover",
  backgroundImage: "background",
  bgImage: "background",
};

/**
 * Derives a media purpose hint from a field name for library filtering.
 * Returns a MediaPurpose value (e.g. "logo", "hero") for the picker dialog
 * to constrain library results. Returns undefined if the field is generic.
 * Uses exact-match map to avoid false positives on fields like "noLogoFallback".
 */
function derivePurposeFromFieldName(
  fieldName: string,
): MediaPurpose | undefined {
  return FIELD_NAME_TO_PURPOSE[fieldName];
}

// ---------------------------------------------------------------------------
// PseudoInspectorHeader — shared header bar for header/footer pseudo-panels
// ---------------------------------------------------------------------------

function PseudoInspectorHeader({
  label,
  description,
  onClose,
}: {
  label: string;
  description: string;
  onClose: () => void;
}) {
  return (
    <div className="border-b border-border px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-foreground leading-tight">
            {label}
          </div>
          <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
            {description}
          </div>
        </div>
        <button
          onClick={onClose}
          title="Deselect (Esc)"
          className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}

export function BlockInspector() {
  const selected = useEditorStore(selectSelectedBlock);
  const selectedId = useEditorStore(selectSelectedId);
  const updateBlockProps = useEditorStore(selectUpdateBlockProps);
  const setSelected = useEditorStore(selectSetSelected);
  const [tab, setTab] = useState<InspectorTab>("content");

  if (
    typeof window !== "undefined" &&
    window.localStorage?.getItem("site-editor:debug") === "1"
  ) {
    // eslint-disable-next-line no-console
    console.log("[site-editor:inspector] render", {
      selectedId,
      hasSelectedBlock: !!selected,
      kind: selected?.kind,
    });
  }

  // ── Header / Footer pseudo-block selection ───────────────────────────────
  // These are not real BlockNodes; they're sentinel IDs set by the
  // Header/Footer pseudo-rows in BlockTreePanel.
  if (selectedId === "header") {
    return (
      <div className="flex h-full flex-col">
        <PseudoInspectorHeader
          label="Header"
          description="Configure global header blocks (nav bar, utility bar, logo)."
          onClose={() => setSelected(null)}
        />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <HeaderPseudoInspector />
        </div>
      </div>
    );
  }

  if (selectedId === "footer") {
    return (
      <div className="flex h-full flex-col">
        <PseudoInspectorHeader
          label="Footer"
          description="Configure global footer blocks (columns, social, copyright)."
          onClose={() => setSelected(null)}
        />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <FooterPseudoInspector />
        </div>
      </div>
    );
  }

  if (!selected || !selectedId) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        <div className="space-y-2">
          <div className="text-[13px] text-foreground/80">
            No block selected
          </div>
          <div className="text-[11.5px] text-muted-foreground/70 max-w-[200px]">
            Click any block in the preview to edit its properties.
          </div>
        </div>
      </div>
    );
  }

  const entry = getCatalogEntry(selected.kind);

  const handleReset = () => {
    if (!entry) return;
    if (!confirm(`Reset "${entry.label}" to default values?`)) return;
    const defaults = entry.createDefaultProps() as Record<string, unknown>;
    // Strip current props by overwriting with defaults; updateBlockProps merges,
    // so we keep previously-unset keys as-is. For reset, we want a full replace.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateBlockProps(selectedId, defaults as any);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-2.5">
        {/* Breadcrumb */}
        <div className="flex items-center gap-0.5 text-[10.5px] text-muted-foreground/70 uppercase tracking-wider font-medium">
          <span>{entry?.category ?? "Block"}</span>
          <ChevronRight size={10} />
          <span className="text-foreground/70">
            {entry?.label ?? selected.kind}
          </span>
        </div>
        {/* Title + actions */}
        <div className="flex items-start justify-between gap-2 mt-1">
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-foreground leading-tight">
              {entry?.label ?? selected.kind}
            </div>
            {entry?.description && (
              <div className="text-[11px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">
                {entry.description}
              </div>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={handleReset}
              title="Reset to defaults"
              className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <RotateCcw size={12} />
            </button>
            <button
              onClick={() => setSelected(null)}
              title="Deselect (Esc)"
              className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      </div>
      {/* Tabs */}
      <div className="border-b border-border px-2 pt-1.5 flex items-center gap-0.5 shrink-0">
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

      <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-5">
        {tab === "content" && (
          <InspectorBoundary label="Block fields">
            <BlockForm block={selected} />
          </InspectorBoundary>
        )}
        {tab === "design" && (
          <>
            <InspectorBoundary label="Spacing">
              <SpacingVisualizer block={selected} />
            </InspectorBoundary>
            <InspectorBoundary label="Style">
              <StyleOverrideSection block={selected} />
            </InspectorBoundary>
            <InspectorBoundary label="Visibility">
              <VisibilitySection block={selected} />
            </InspectorBoundary>
          </>
        )}
        {tab === "advanced" && (
          <InspectorBoundary label="Advanced">
            <AdvancedSection block={selected} />
          </InspectorBoundary>
        )}
      </div>
    </div>
  );
}

function InspectorTabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex-1 flex items-center justify-center gap-1.5 h-8 rounded-t-md text-[12px] font-medium transition-colors " +
        (active
          ? "bg-card text-foreground border-b-2 border-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border-b-2 border-transparent")
      }
    >
      <Icon size={12} />
      {label}
    </button>
  );
}

/**
 * Compact margin/padding visualizer. Outer box = margin, inner box = padding,
 * innermost = content. Each numeric shows the current preset value.
 */
function SpacingVisualizer({ block }: { block: BlockNode }) {
  const style = block.style ?? {};
  const marginY = style.marginY ?? "—";
  const paddingY = style.paddingY ?? "—";
  const paddingX = style.paddingX ?? "—";
  const fmt = (v: unknown) => (v === undefined || v === null ? "—" : String(v));
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
        Margin / Padding
      </div>
      <div className="relative">
        {/* Outer box — margin */}
        <div className="rounded-sm border border-dashed border-amber-500/50 bg-amber-50/40 dark:bg-amber-950/20 p-3">
          <div className="flex items-center justify-center text-[9px] uppercase tracking-widest text-amber-700/80 dark:text-amber-300/80 mb-1">
            margin · {fmt(marginY)}
          </div>
          {/* Padding box */}
          <div className="rounded-sm border border-dashed border-emerald-500/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-2">
            <div className="flex items-center justify-between text-[9px] uppercase tracking-widest text-emerald-700/80 dark:text-emerald-300/80 mb-1">
              <span>padding X · {fmt(paddingX)}</span>
              <span>Y · {fmt(paddingY)}</span>
            </div>
            {/* Content */}
            <div className="rounded-sm bg-card border border-border py-2 text-center text-[10px] text-muted-foreground">
              Content
            </div>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground/70 mt-2">
        Edit the dropdowns below to change these presets.
      </p>
    </div>
  );
}

// React's error boundaries still require a class component. Renders an inline
// error notice with the section label + message so one bad section doesn't
// blank the whole inspector pane.
class InspectorBoundary extends Component<
  { label: string; children: ReactNode },
  { err: Error | null }
> {
  state: { err: Error | null } = { err: null };
  static getDerivedStateFromError(err: Error) {
    return { err };
  }
  componentDidCatch(err: Error) {
    console.error("[BlockInspector]", this.props.label, err);
  }
  render() {
    if (this.state.err) {
      return (
        <div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs">
          <div className="font-semibold text-destructive">
            {this.props.label} failed to render
          </div>
          <div className="text-muted-foreground">{this.state.err.message}</div>
          <button
            type="button"
            onClick={() => this.setState({ err: null })}
            className="text-[11px] underline hover:text-foreground"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function VisibilitySection({ block }: { block: BlockNode }) {
  const updateBlockVisibility = useEditorStore(selectUpdateBlockVisibility);
  const vis = block.visibility ?? {};
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Device visibility
      </Label>
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            { key: "desktop", label: "Desktop" },
            { key: "tablet", label: "Tablet" },
            { key: "mobile", label: "Mobile" },
          ] as const
        ).map(({ key, label }) => {
          const visible = vis[key] !== false;
          return (
            <div
              key={key}
              className="flex flex-col items-center gap-1 rounded-md border border-border p-2"
            >
              <Switch
                checked={visible}
                onCheckedChange={(v) =>
                  updateBlockVisibility(block.id, {
                    [key]: v ? undefined : false,
                  })
                }
                aria-label={`Show on ${label}`}
              />
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          );
        })}
      </div>
      {(vis.mobile === false ||
        vis.tablet === false ||
        vis.desktop === false) && (
        <p className="text-[10px] text-amber-600">
          Hidden on{" "}
          {[
            vis.desktop === false && "desktop",
            vis.tablet === false && "tablet",
            vis.mobile === false && "mobile",
          ]
            .filter(Boolean)
            .join(", ")}
        </p>
      )}
    </div>
  );
}

// Radix's <Select.Item /> forbids empty-string values, so we use a sentinel
// to represent "no override / inherit from theme" and map it to undefined
// on the way out.
const DEFAULT_SENTINEL = "__default__";

const THEME_TOKEN_OPTIONS = [
  { value: DEFAULT_SENTINEL, label: "Default" },
  { value: "color-primary", label: "Primary" },
  { value: "color-secondary", label: "Secondary" },
  { value: "color-accent", label: "Accent" },
  { value: "color-background", label: "Background" },
  { value: "color-surface", label: "Surface" },
  { value: "color-text", label: "Text" },
  { value: "color-muted", label: "Muted" },
];

function fromSentinel(v: string): string | undefined {
  return v === DEFAULT_SENTINEL || v === "" ? undefined : v;
}

function toSentinel(v: string | undefined): string {
  return v ?? DEFAULT_SENTINEL;
}

function StyleOverrideSection({ block }: { block: BlockNode }) {
  const updateBlockStyle = useEditorStore(selectUpdateBlockStyle);
  const style = block.style ?? {};

  return (
    <details className="group" open>
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Style
      </summary>
      <div className="mt-2 space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Alignment</Label>
          <Select
            value={toSentinel(style.alignment)}
            onValueChange={(v) =>
              updateBlockStyle(block.id, {
                alignment: fromSentinel(v) as typeof style.alignment,
              })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Default" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DEFAULT_SENTINEL}>Default</SelectItem>
              <SelectItem value="start">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="end">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Padding Y</Label>
            <Select
              value={toSentinel(style.paddingY)}
              onValueChange={(v) =>
                updateBlockStyle(block.id, {
                  paddingY: fromSentinel(v) as typeof style.paddingY,
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_SENTINEL}>Default</SelectItem>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="spacious">Spacious</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Padding X</Label>
            <Select
              value={toSentinel(style.paddingX)}
              onValueChange={(v) =>
                updateBlockStyle(block.id, {
                  paddingX: fromSentinel(v) as typeof style.paddingX,
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_SENTINEL}>Default</SelectItem>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="spacious">Spacious</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Margin Y</Label>
          <Select
            value={toSentinel(style.marginY)}
            onValueChange={(v) =>
              updateBlockStyle(block.id, {
                marginY: fromSentinel(v) as typeof style.marginY,
              })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Default" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DEFAULT_SENTINEL}>Default</SelectItem>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="sm">Small</SelectItem>
              <SelectItem value="md">Medium</SelectItem>
              <SelectItem value="lg">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Max Width</Label>
          <Select
            value={toSentinel(style.maxWidth)}
            onValueChange={(v) =>
              updateBlockStyle(block.id, {
                maxWidth: fromSentinel(v) as typeof style.maxWidth,
              })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Default" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DEFAULT_SENTINEL}>Default</SelectItem>
              <SelectItem value="narrow">Narrow (640px)</SelectItem>
              <SelectItem value="default">Default (1200px)</SelectItem>
              <SelectItem value="wide">Wide (1440px)</SelectItem>
              <SelectItem value="full">Full width</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Background</Label>
          <Select
            value={toSentinel(style.backgroundToken)}
            onValueChange={(v) =>
              updateBlockStyle(block.id, {
                backgroundToken: fromSentinel(v),
              })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Default" />
            </SelectTrigger>
            <SelectContent>
              {THEME_TOKEN_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Text Color</Label>
          <Select
            value={toSentinel(style.textToken)}
            onValueChange={(v) =>
              updateBlockStyle(block.id, {
                textToken: fromSentinel(v),
              })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Default" />
            </SelectTrigger>
            <SelectContent>
              {THEME_TOKEN_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Border Radius</Label>
            <Select
              value={toSentinel(style.borderRadius)}
              onValueChange={(v) =>
                updateBlockStyle(block.id, {
                  borderRadius: fromSentinel(v) as typeof style.borderRadius,
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_SENTINEL}>Default</SelectItem>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="sm">Small</SelectItem>
                <SelectItem value="md">Medium</SelectItem>
                <SelectItem value="lg">Large</SelectItem>
                <SelectItem value="full">Full</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Shadow</Label>
            <Select
              value={toSentinel(style.shadow)}
              onValueChange={(v) =>
                updateBlockStyle(block.id, {
                  shadow: fromSentinel(v) as typeof style.shadow,
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_SENTINEL}>Default</SelectItem>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="sm">Small</SelectItem>
                <SelectItem value="md">Medium</SelectItem>
                <SelectItem value="lg">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Border Width</Label>
            <Select
              value={
                style.borderWidth === undefined
                  ? DEFAULT_SENTINEL
                  : String(style.borderWidth)
              }
              onValueChange={(v) => {
                if (v === DEFAULT_SENTINEL) {
                  updateBlockStyle(block.id, { borderWidth: undefined });
                  return;
                }
                const n = Number(v);
                if (n === 0 || n === 1 || n === 2 || n === 4) {
                  updateBlockStyle(block.id, { borderWidth: n });
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_SENTINEL}>Default</SelectItem>
                <SelectItem value="0">None</SelectItem>
                <SelectItem value="1">1px</SelectItem>
                <SelectItem value="2">2px</SelectItem>
                <SelectItem value="4">4px</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Border Tone</Label>
            <Select
              value={toSentinel(style.borderTone)}
              onValueChange={(v) =>
                updateBlockStyle(block.id, {
                  borderTone: fromSentinel(v) as typeof style.borderTone,
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_SENTINEL}>Default</SelectItem>
                <SelectItem value="subtle">Subtle</SelectItem>
                <SelectItem value="strong">Strong</SelectItem>
                <SelectItem value="accent">Accent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Margin X</Label>
            <Select
              value={toSentinel(style.marginX)}
              onValueChange={(v) =>
                updateBlockStyle(block.id, {
                  marginX: fromSentinel(v) as typeof style.marginX,
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_SENTINEL}>Default</SelectItem>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="sm">Small</SelectItem>
                <SelectItem value="md">Medium</SelectItem>
                <SelectItem value="lg">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Margin (all)</Label>
            <Select
              value={toSentinel(style.margin)}
              onValueChange={(v) =>
                updateBlockStyle(block.id, {
                  margin: fromSentinel(v) as typeof style.margin,
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_SENTINEL}>Default</SelectItem>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="sm">Small</SelectItem>
                <SelectItem value="md">Medium</SelectItem>
                <SelectItem value="lg">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Gap</Label>
            <Select
              value={toSentinel(style.gap)}
              onValueChange={(v) =>
                updateBlockStyle(block.id, {
                  gap: fromSentinel(v) as typeof style.gap,
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_SENTINEL}>Default</SelectItem>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="spacious">Spacious</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Min Height</Label>
            <Select
              value={toSentinel(style.minHeight)}
              onValueChange={(v) =>
                updateBlockStyle(block.id, {
                  minHeight: fromSentinel(v) as typeof style.minHeight,
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_SENTINEL}>Default</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="sm">Small (200px)</SelectItem>
                <SelectItem value="md">Medium (400px)</SelectItem>
                <SelectItem value="lg">Large (600px)</SelectItem>
                <SelectItem value="screen">Screen (100vh)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Items Align</Label>
            <Select
              value={toSentinel(style.itemsAlign)}
              onValueChange={(v) =>
                updateBlockStyle(block.id, {
                  itemsAlign: fromSentinel(v) as typeof style.itemsAlign,
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_SENTINEL}>Default</SelectItem>
                <SelectItem value="start">Start</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="end">End</SelectItem>
                <SelectItem value="stretch">Stretch</SelectItem>
                <SelectItem value="baseline">Baseline</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Justify</Label>
            <Select
              value={toSentinel(style.justify)}
              onValueChange={(v) =>
                updateBlockStyle(block.id, {
                  justify: fromSentinel(v) as typeof style.justify,
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_SENTINEL}>Default</SelectItem>
                <SelectItem value="start">Start</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="end">End</SelectItem>
                <SelectItem value="between">Between</SelectItem>
                <SelectItem value="around">Around</SelectItem>
                <SelectItem value="evenly">Evenly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isTextishBlock(block.kind) && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Text Size</Label>
              <Select
                value={toSentinel(style.textSize)}
                onValueChange={(v) =>
                  updateBlockStyle(block.id, {
                    textSize: fromSentinel(v) as typeof style.textSize,
                  })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_SENTINEL}>Default</SelectItem>
                  <SelectItem value="xs">Extra small</SelectItem>
                  <SelectItem value="sm">Small</SelectItem>
                  <SelectItem value="base">Base</SelectItem>
                  <SelectItem value="lg">Large</SelectItem>
                  <SelectItem value="xl">XL</SelectItem>
                  <SelectItem value="2xl">2XL</SelectItem>
                  <SelectItem value="3xl">3XL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Text Weight</Label>
              <Select
                value={toSentinel(style.textWeight)}
                onValueChange={(v) =>
                  updateBlockStyle(block.id, {
                    textWeight: fromSentinel(v) as typeof style.textWeight,
                  })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_SENTINEL}>Default</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="semibold">Semibold</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-xs">Background Color</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={style.backgroundColor ?? "#ffffff"}
              onChange={(e) =>
                updateBlockStyle(block.id, {
                  backgroundColor: e.target.value,
                })
              }
              className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
              title="Pick a background color"
            />
            <Input
              value={style.backgroundColor ?? ""}
              onChange={(e) =>
                updateBlockStyle(block.id, {
                  backgroundColor: e.target.value.trim() || undefined,
                })
              }
              placeholder="#ffffff or rgba(…)"
              className="h-8 flex-1 text-xs font-mono"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Text Color Override</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={style.color ?? "#000000"}
              onChange={(e) =>
                updateBlockStyle(block.id, { color: e.target.value })
              }
              className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
              title="Pick a text color"
            />
            <Input
              value={style.color ?? ""}
              onChange={(e) =>
                updateBlockStyle(block.id, {
                  color: e.target.value.trim() || undefined,
                })
              }
              placeholder="#000000 or rgba(…)"
              className="h-8 flex-1 text-xs font-mono"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Background Image</Label>
          <MediaPickerField
            value={style.backgroundImage ?? ""}
            onChange={(v) =>
              updateBlockStyle(block.id, {
                backgroundImage: v.trim() || undefined,
              })
            }
            placeholder="https://… or pick from library"
            previewSize={56}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Background Overlay</Label>
          <Select
            value={toSentinel(style.backgroundOverlay)}
            onValueChange={(v) =>
              updateBlockStyle(block.id, {
                backgroundOverlay: fromSentinel(
                  v,
                ) as typeof style.backgroundOverlay,
              })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Default" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DEFAULT_SENTINEL}>Default</SelectItem>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="brand">Brand</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
          <div>
            <Label className="text-xs font-medium">Full bleed</Label>
            <p className="text-[10px] text-muted-foreground">
              Break out of max-width to fill viewport
            </p>
          </div>
          <Switch
            checked={style.fullBleed ?? false}
            onCheckedChange={(v) =>
              updateBlockStyle(block.id, {
                fullBleed: v ? true : undefined,
              })
            }
            aria-label="Full bleed"
          />
        </div>
      </div>
    </details>
  );
}

const TEXTISH_BLOCK_KINDS = new Set([
  "heading",
  "rich-text",
  "markdown-body",
  "hero",
  "announcement-bar",
  "trust-strip",
  "story-split",
  "stats-band",
  "newsletter",
  "faq",
  "testimonials",
  "pdp-details",
  "contact-block",
]);

function isTextishBlock(kind: string): boolean {
  return TEXTISH_BLOCK_KINDS.has(kind);
}

function AdvancedSection({ block }: { block: BlockNode }) {
  const updateBlockId = useEditorStore(selectUpdateBlockId);
  const [editingId, setEditingId] = useState(block.id);

  // Sync when selection changes
  if (editingId !== block.id && !editingId.startsWith("__editing__")) {
    // block.id changed externally (e.g. undo) — reset
  }

  return (
    <details className="group">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Advanced
      </summary>
      <div className="mt-2 space-y-2">
        <div className="space-y-1">
          <Label className="text-xs">
            Block ID{" "}
            <span className="font-normal text-muted-foreground">
              (for anchor links: #{block.id})
            </span>
          </Label>
          <Input
            value={editingId}
            onChange={(e) => setEditingId(e.target.value)}
            onBlur={() => {
              if (editingId.trim() && editingId !== block.id) {
                updateBlockId(block.id, editingId.trim());
              }
            }}
            className="h-8 font-mono text-xs"
            placeholder="unique-section-id"
          />
          <p className="text-[10px] text-muted-foreground">
            Use this ID for anchor links: add a button with href{" "}
            <code>#{block.id}</code> to scroll here.
          </p>
        </div>
      </div>
    </details>
  );
}

function BlockForm({ block }: { block: BlockNode }) {
  const updateBlockProps = useEditorStore(selectUpdateBlockProps);
  const schema = (BlockPropsSchemas as Record<string, z.ZodType<unknown>>)[
    block.kind
  ];
  // Hooks must be called unconditionally before any early returns.
  const fields = useMemo(
    () => (schema ? introspectSchema(schema) : []),
    [schema],
  );

  if (CUSTOM_INSPECTOR_KINDS.has(block.kind)) {
    return <CustomInspectorPanel block={block} />;
  }

  if (!schema) {
    return <JsonFallback block={block} />;
  }

  const value = block.props as Record<string, unknown>;

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <FieldRenderer
          key={field.name}
          field={field}
          value={value[field.name]}
          onChange={(v) =>
            updateBlockProps(block.id, { [field.name]: v } as never)
          }
          blockKind={block.kind}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Schema introspection
// ---------------------------------------------------------------------------

type FieldKind =
  | "string"
  | "textarea"
  | "number"
  | "boolean"
  | "enum"
  | "array-of-objects"
  | "array-of-strings"
  | "raw";

interface FieldDescriptor {
  name: string;
  kind: FieldKind;
  optional: boolean;
  /** For enum fields. */
  options?: string[];
  /** For array-of-objects: sub-field descriptors. */
  itemFields?: FieldDescriptor[];
  /** For array-of-objects: fresh-item factory. */
  createItem?: () => Record<string, unknown>;
}

function unwrap(schema: z.ZodType<unknown>): {
  inner: z.ZodType<unknown>;
  optional: boolean;
} {
  let inner: z.ZodType<unknown> = schema;
  let optional = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  while ((inner as any)._def) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const def = (inner as any)._def;
    if (def.typeName === "ZodOptional" || def.typeName === "ZodNullable") {
      optional = true;
      inner = def.innerType;
      continue;
    }
    if (def.typeName === "ZodDefault") {
      inner = def.innerType;
      continue;
    }
    break;
  }
  return { inner, optional };
}

function describeField(
  name: string,
  schema: z.ZodType<unknown>,
): FieldDescriptor {
  const { inner, optional } = unwrap(schema);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def = (inner as any)._def;
  const typeName = def?.typeName as string | undefined;

  if (typeName === "ZodString") {
    const checks = (def.checks ?? []) as Array<{
      kind: string;
      value?: number;
    }>;
    const maxCheck = checks.find((c) => c.kind === "max");
    const isLong = (maxCheck?.value ?? 0) > 500;
    return { name, kind: isLong ? "textarea" : "string", optional };
  }
  if (typeName === "ZodNumber") {
    return { name, kind: "number", optional };
  }
  if (typeName === "ZodBoolean") {
    return { name, kind: "boolean", optional };
  }
  if (typeName === "ZodEnum") {
    return {
      name,
      kind: "enum",
      optional,
      options: (def.values as string[]) ?? [],
    };
  }
  if (typeName === "ZodUnion") {
    // Handle z.union([z.literal(2), z.literal(3), ...]) → enum-ish
    const options = def.options as z.ZodType<unknown>[];
    const literals: string[] = [];
    for (const opt of options) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const od = (opt as any)._def;
      if (od?.typeName === "ZodLiteral" && od.value !== undefined) {
        literals.push(String(od.value));
      }
    }
    if (literals.length === options.length && literals.length > 0) {
      return { name, kind: "enum", optional, options: literals };
    }
    return { name, kind: "raw", optional };
  }
  if (typeName === "ZodArray") {
    const element = def.type as z.ZodType<unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const elDef = (element as any)._def;
    if (elDef?.typeName === "ZodObject") {
      const shape = elDef.shape() as Record<string, z.ZodType<unknown>>;
      const itemFields = Object.entries(shape).map(([k, v]) =>
        describeField(k, v),
      );
      const createItem = () => {
        const out: Record<string, unknown> = {};
        for (const f of itemFields) {
          out[f.name] =
            f.kind === "string" || f.kind === "textarea"
              ? ""
              : f.kind === "number"
                ? 0
                : f.kind === "boolean"
                  ? false
                  : f.kind === "enum" && f.options?.[0]
                    ? f.options[0]
                    : "";
        }
        return out;
      };
      return {
        name,
        kind: "array-of-objects",
        optional,
        itemFields,
        createItem,
      };
    }
    if (elDef?.typeName === "ZodString") {
      return { name, kind: "array-of-strings", optional };
    }
    return { name, kind: "raw", optional };
  }
  return { name, kind: "raw", optional };
}

function introspectSchema(schema: z.ZodType<unknown>): FieldDescriptor[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def = (schema as any)._def;
  if (def?.typeName !== "ZodObject") return [];
  const shape = def.shape() as Record<string, z.ZodType<unknown>>;
  return Object.entries(shape).map(([name, s]) => describeField(name, s));
}

// ---------------------------------------------------------------------------
// Field renderer
// ---------------------------------------------------------------------------

function FieldRenderer({
  field,
  value,
  onChange,
  blockKind,
  parentField,
}: {
  field: FieldDescriptor;
  value: unknown;
  onChange: (v: unknown) => void;
  /** When provided, used to look up label/tooltip overrides. */
  blockKind?: string;
  /**
   * Name of the enclosing array-of-objects field, when the renderer is
   * drawing a sub-field. Lets us treat `src` as an image inside `images[]`
   * / `logos[]` / `slides[]` while leaving plain `embed.src` alone.
   */
  parentField?: string;
}) {
  const override = blockKind
    ? getFieldOverride(blockKind, field.name)
    : undefined;
  const labelText = override?.label ?? humanize(field.name);

  /** Renders the label, optionally with a tooltip info icon. */
  function FieldLabel() {
    if (!override?.tooltip) {
      return <Label>{labelText}</Label>;
    }
    return (
      <div className="flex items-center gap-1">
        <Label>{labelText}</Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              aria-label={`Help: ${labelText}`}
            >
              <Info size={11} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[240px]">
            {override.tooltip}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  if (field.kind === "string") {
    if (field.name === "categoryId") {
      return (
        <CategoryPickerField
          value={(value as string | undefined) ?? ""}
          onChange={(v) => onChange(v || undefined)}
        />
      );
    }
    if (isImageFieldName(field.name, { blockKind, parentField })) {
      const purpose = derivePurposeFromFieldName(field.name);
      return (
        <div className="space-y-1">
          <FieldLabel />
          <MediaPickerField
            value={(value as string | undefined) ?? ""}
            onChange={(v) => onChange(v || undefined)}
            placeholder="https://… or pick from library"
            previewSize={56}
            helperText={override?.helpText}
            purpose={purpose}
          />
        </div>
      );
    }
    return (
      <div className="space-y-1">
        <FieldLabel />
        <Input
          value={(value as string | undefined) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
        {override?.helpText && (
          <p className="text-[10px] text-muted-foreground">
            {override.helpText}
          </p>
        )}
      </div>
    );
  }
  if (field.kind === "textarea") {
    const isCode = field.name === "html" || field.name === "css";
    return (
      <div className="space-y-1">
        <FieldLabel />
        <Textarea
          rows={isCode ? 10 : 5}
          value={(value as string | undefined) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={isCode ? "font-mono text-xs" : undefined}
          spellCheck={!isCode}
        />
        {isCode && (
          <p className="text-[10px] text-muted-foreground">
            {field.name === "html"
              ? "Raw HTML — rendered as-is on your site."
              : "Scoped CSS — applied inside this block only."}
          </p>
        )}
        {!isCode && override?.helpText && (
          <p className="text-[10px] text-muted-foreground">
            {override.helpText}
          </p>
        )}
      </div>
    );
  }
  if (field.kind === "number") {
    return (
      <div className="space-y-1">
        <FieldLabel />
        <Input
          type="number"
          value={(value as number | undefined) ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "" ? undefined : Number(v));
          }}
        />
        {override?.helpText && (
          <p className="text-[10px] text-muted-foreground">
            {override.helpText}
          </p>
        )}
      </div>
    );
  }
  if (field.kind === "boolean") {
    return (
      <div className="flex items-center justify-between rounded-md border border-border p-3">
        <div>
          <span className="text-sm">{labelText}</span>
          {override?.helpText && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {override.helpText}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {override?.tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                  aria-label={`Help: ${labelText}`}
                >
                  <Info size={11} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[240px]">
                {override.tooltip}
              </TooltipContent>
            </Tooltip>
          )}
          <Switch checked={!!value} onCheckedChange={(v) => onChange(v)} />
        </div>
      </div>
    );
  }
  if (field.kind === "enum" && field.options) {
    // Radix's controlled Select accepts value="" as "no value" but some
    // versions still warn; pass undefined so the placeholder renders clean.
    const current =
      value === undefined || value === null || value === ""
        ? undefined
        : String(value);
    return (
      <div className="space-y-1">
        <FieldLabel />
        <Select
          value={current}
          onValueChange={(v) => {
            const asNum = Number(v);
            onChange(Number.isFinite(asNum) && String(asNum) === v ? asNum : v);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={field.optional ? "Default" : undefined} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {override?.helpText && (
          <p className="text-[10px] text-muted-foreground">
            {override.helpText}
          </p>
        )}
      </div>
    );
  }
  if (field.kind === "array-of-strings") {
    if (field.name === "productIds") {
      return (
        <ProductPickerField
          value={value as string[] | undefined}
          onChange={onChange}
        />
      );
    }
    const arr = (value as string[] | undefined) ?? [];
    return (
      <div className="space-y-1">
        <FieldLabel />
        <Input
          value={arr.join(", ")}
          onChange={(e) =>
            onChange(
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
          placeholder="comma-separated"
        />
        {override?.helpText && (
          <p className="text-[10px] text-muted-foreground">
            {override.helpText}
          </p>
        )}
      </div>
    );
  }
  if (field.kind === "array-of-objects") {
    const arr = (
      (value as Record<string, unknown>[] | undefined) ?? []
    ).slice();
    const addItem = () => {
      onChange([...arr, field.createItem?.() ?? {}]);
    };
    const removeItem = (idx: number) => {
      onChange(arr.filter((_, i) => i !== idx));
    };
    const updateItem = (idx: number, itemPatch: Record<string, unknown>) => {
      const next = [...arr];
      next[idx] = { ...next[idx], ...itemPatch };
      onChange(next);
    };
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <FieldLabel />
          <Button size="sm" variant="outline" onClick={addItem}>
            <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Add
          </Button>
        </div>
        <div className="space-y-2">
          {arr.map((item, idx) => (
            <div
              key={idx}
              className="space-y-2 rounded-md border border-border p-3"
            >
              <div className="flex items-center justify-end">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeItem(idx)}
                  aria-label="Remove item"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
              {(field.itemFields ?? []).map((sub) => (
                <FieldRenderer
                  key={sub.name}
                  field={sub}
                  value={item[sub.name]}
                  onChange={(v) => updateItem(idx, { [sub.name]: v })}
                  // Sub-fields of array-of-objects don't carry block-kind
                  // context, but they do inherit the parent array's name so
                  // image-typed sub-fields (e.g. `src` inside `images[]`)
                  // can render as a MediaPicker.
                  parentField={field.name}
                />
              ))}
            </div>
          ))}
          {arr.length === 0 && (
            <div className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
              No items yet.
            </div>
          )}
        </div>
      </div>
    );
  }
  // raw fallback
  return (
    <div className="space-y-1">
      <FieldLabel />
      <Textarea
        rows={4}
        value={JSON.stringify(value ?? "", null, 2)}
        onChange={(e) => {
          try {
            onChange(JSON.parse(e.target.value));
          } catch {
            // keep typing — ignore until valid
          }
        }}
      />
      <p className="text-[10px] text-muted-foreground">
        Raw JSON (unsupported field type)
      </p>
    </div>
  );
}

function JsonFallback({ block }: { block: BlockNode }) {
  const updateBlockProps = useEditorStore(selectUpdateBlockProps);
  return (
    <div className="space-y-1">
      <Label>Raw props</Label>
      <Textarea
        rows={10}
        defaultValue={JSON.stringify(block.props, null, 2)}
        onChange={(e) => {
          try {
            const parsed = JSON.parse(e.target.value);
            if (parsed && typeof parsed === "object") {
              updateBlockProps(block.id, parsed as never);
            }
          } catch {
            // ignore
          }
        }}
      />
      <p className="text-[10px] text-muted-foreground">
        No schema found for this block kind. Edit raw JSON.
      </p>
    </div>
  );
}

function humanize(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}
