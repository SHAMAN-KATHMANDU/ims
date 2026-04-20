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
  Copy,
  Trash2,
  Settings,
  EyeOff,
  Box,
  Hash,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  | "theme"
  | "nav"
  | "media"
  | "blog"
  | "seo";

const RAIL: {
  id: PanelId;
  label: string;
  kbd: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
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
  { id: "theme", label: "Theme", kbd: "4", Icon: Palette },
  { id: "nav", label: "Navigation", kbd: "5", Icon: Navigation },
  { id: "media", label: "Media", kbd: "6", Icon: Image },
  { id: "blog", label: "Blog", kbd: "7", Icon: FileText },
  { id: "seo", label: "SEO", kbd: "8", Icon: Globe },
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
const ACCENT = "oklch(0.72 0.15 45)";

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
        "h-7 w-7 grid place-items-center rounded text-stone-500 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors",
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
      <div className={cn("w-px self-stretch bg-stone-200 mx-0.5", className)} />
    );
  return <div className={cn("h-px bg-stone-200", className)} />;
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
      className="fixed inset-0 z-[100] bg-stone-900/20 backdrop-blur-sm flex items-start justify-center pt-24"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-[520px] overflow-hidden border border-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 h-12 border-b border-stone-200">
          <Search size={14} className="text-stone-400 shrink-0" />
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
            className="flex-1 bg-transparent focus:outline-none text-[14px] text-stone-900 placeholder:text-stone-400"
          />
          <kbd className="text-[10.5px] px-1.5 py-0.5 rounded border border-stone-200 bg-stone-50 text-stone-500 font-mono">
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
                i === idx ? "bg-stone-50" : "hover:bg-stone-50",
              )}
            >
              <div className="h-7 w-7 rounded bg-stone-100 grid place-items-center shrink-0 text-stone-600">
                <Box size={13} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-stone-900 leading-tight">
                  {b.label}
                </div>
                <div className="text-[11px] text-stone-500 truncate leading-tight">
                  {b.description}
                </div>
              </div>
              <span className="text-[10px] font-mono text-stone-400 uppercase">
                {b.category}
              </span>
              {i === idx && (
                <kbd className="text-[10px] px-1 py-0.5 rounded border border-stone-200 bg-stone-50 text-stone-500 font-mono">
                  ↵
                </kbd>
              )}
            </button>
          ))}
          {results.length === 0 && (
            <div className="px-4 py-8 text-center text-[12px] text-stone-400">
              No blocks match.
            </div>
          )}
        </div>
        <div className="border-t border-stone-200 px-4 py-2 flex items-center justify-between text-[10.5px] text-stone-400 bg-stone-50">
          <span className="flex items-center gap-3">
            <span>
              <kbd className="text-[10px] px-1 py-0.5 rounded border border-stone-200 bg-white font-mono">
                ↑↓
              </kbd>{" "}
              Navigate
            </span>
            <span>
              <kbd className="text-[10px] px-1 py-0.5 rounded border border-stone-200 bg-white font-mono">
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
      className="fixed inset-0 z-[100] bg-stone-900/40 backdrop-blur-sm grid place-items-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-[480px] overflow-hidden border border-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-stone-200 flex items-start gap-4">
          <div className="h-10 w-10 rounded-lg bg-emerald-50 grid place-items-center shrink-0">
            <Rocket size={18} className="text-emerald-700" />
          </div>
          <div className="flex-1">
            <div className="text-[15px] font-semibold text-stone-900 mb-0.5">
              {isPending ? "Publishing…" : "Publish to live?"}
            </div>
            <div className="text-[12.5px] text-stone-500">
              {isPending
                ? "Pushing changes to your live site…"
                : "All draft changes will become visible to your customers."}
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 grid place-items-center rounded text-stone-400 hover:bg-stone-100"
          >
            <X size={13} />
          </button>
        </div>
        <div className="p-5 bg-stone-50 flex flex-col gap-3">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-stone-500">Draft status</span>
            <span className="font-mono text-stone-900">
              {dirty ? "Unsaved changes" : "Up to date"}
            </span>
          </div>
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-stone-500">Build</span>
            <span className="font-mono text-stone-900">static · ISR</span>
          </div>
        </div>
        <div className="p-4 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="h-8 px-3 rounded-md border border-stone-200 text-[12.5px] font-medium text-stone-700 hover:bg-stone-50"
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
      className="fixed inset-0 z-[100] bg-stone-900/40 backdrop-blur-sm grid place-items-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-[400px] border border-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-11 px-4 flex items-center justify-between border-b border-stone-200">
          <div className="text-[13px] font-semibold text-stone-900">
            Keyboard shortcuts
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 grid place-items-center rounded text-stone-400 hover:bg-stone-100"
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
              <span className="text-stone-600">{label}</span>
              <kbd className="text-[11px] px-1.5 py-0.5 rounded border border-stone-200 border-b-2 bg-white text-stone-500 font-mono">
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
}: {
  target: EditorTarget;
  setTarget: (t: EditorTarget) => void;
  customPages: Array<{ id: string; title: string }>;
}) {
  const [q, setQ] = useState("");
  const filtered = BUILT_IN_SCOPES.filter(
    (s) => q === "" || s.label.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="flex flex-col h-full">
      <div className="h-11 px-3 flex items-center border-b border-stone-200 shrink-0">
        <span className="text-[13px] font-semibold text-stone-900 flex-1">
          Pages
        </span>
      </div>
      <div className="px-3 pt-2.5 pb-2 shrink-0">
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search pages…"
            className="w-full h-7 pl-7 pr-2.5 rounded-md border border-stone-200 bg-stone-50 text-[12px] text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 px-2 mb-1">
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
                      ? "bg-stone-900 text-white"
                      : "text-stone-700 hover:bg-stone-50",
                  )}
                >
                  <Hash
                    size={12}
                    className={cn(active ? "text-white/60" : "text-stone-400")}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium truncate">
                      {s.label}
                    </div>
                    <div
                      className={cn(
                        "text-[10.5px] font-mono truncate",
                        active ? "text-white/50" : "text-stone-400",
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

        {customPages.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 px-2 mb-1">
              Custom pages
            </div>
            <div className="flex flex-col gap-0.5">
              {customPages.map((p) => {
                const active =
                  target.scope === "page" && target.pageId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setTarget({ scope: "page", pageId: p.id })}
                    className={cn(
                      "flex items-center gap-2.5 px-2 h-9 rounded-md w-full text-left transition-colors",
                      active
                        ? "bg-stone-900 text-white"
                        : "text-stone-700 hover:bg-stone-50",
                    )}
                  >
                    <Hash
                      size={12}
                      className={cn(
                        active ? "text-white/60" : "text-stone-400",
                      )}
                    />
                    <div className="text-[12.5px] font-medium truncate flex-1">
                      {p.title}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --------------- Blocks panel ---------------
function BlocksPanel({ onAdd }: { onAdd: (kind: string) => void }) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("All");

  const filtered = BLOCK_CATALOG.filter(
    (b) =>
      (group === "All" || b.category.toLowerCase() === group.toLowerCase()) &&
      (q === "" ||
        b.label.toLowerCase().includes(q.toLowerCase()) ||
        b.description.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="flex flex-col h-full">
      <div className="h-11 px-3 flex items-center border-b border-stone-200 shrink-0">
        <span className="text-[13px] font-semibold text-stone-900">
          Add blocks
        </span>
      </div>
      <div className="px-3 pt-2.5 pb-2 flex flex-col gap-2 shrink-0">
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search 60+ blocks…"
            className="w-full h-7 pl-7 pr-2.5 rounded-md border border-stone-200 bg-stone-50 text-[12px] text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400"
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
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200",
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="grid grid-cols-2 gap-1.5">
          {filtered.map((b) => (
            <button
              key={b.kind}
              onClick={() => onAdd(b.kind)}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("block-kind", b.kind)}
              className="group flex flex-col gap-1.5 p-2.5 rounded-md border border-stone-200 bg-white hover:border-stone-400 hover:bg-stone-50 text-left transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="h-7 w-7 rounded bg-stone-100 grid place-items-center text-stone-600 group-hover:bg-white">
                  <Box size={13} />
                </div>
                <Plus
                  size={11}
                  className="text-stone-400 mt-1 opacity-0 group-hover:opacity-100"
                />
              </div>
              <div>
                <div className="text-[11.5px] font-semibold text-stone-900 leading-tight">
                  {b.label}
                </div>
                <div className="text-[10px] text-stone-400 leading-tight mt-0.5 line-clamp-2">
                  {b.description}
                </div>
              </div>
            </button>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-[12px] text-stone-400">
            No blocks match.
          </div>
        )}
      </div>
      <div className="border-t border-stone-200 px-3 py-2 flex items-center justify-between text-[10.5px] text-stone-400 shrink-0">
        <span>{filtered.length} blocks</span>
        <span className="font-mono">Drag or click</span>
      </div>
    </div>
  );
}

// --------------- Layers panel ---------------
function LayersPanel({
  blocks,
  selectedId,
}: {
  blocks: BlockNode[];
  selectedId: string | null;
}) {
  const setSelected = useEditorStore((s) => s.setSelected);
  const moveBlock = useEditorStore((s) => s.moveBlock);
  const removeBlock = useEditorStore((s) => s.removeBlock);
  const duplicateBlock = useEditorStore((s) => s.duplicateBlock);
  const updateBlockVisibility = useEditorStore((s) => s.updateBlockVisibility);

  return (
    <div className="flex flex-col h-full">
      <div className="h-11 px-3 flex items-center border-b border-stone-200 shrink-0">
        <span className="text-[13px] font-semibold text-stone-900 flex-1">
          Layers
        </span>
        <span className="text-[11px] text-stone-400 font-mono">
          {blocks.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {blocks.length === 0 && (
          <div className="text-center py-12 text-[12px] text-stone-400">
            <Layers size={24} className="mx-auto mb-2 opacity-40" />
            No blocks yet.
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
              className={cn(
                "group flex items-center gap-1.5 px-2 h-9 rounded-md cursor-pointer transition-colors",
                active
                  ? "bg-stone-900 text-white"
                  : "hover:bg-stone-50 text-stone-700",
              )}
            >
              <GripVertical
                size={11}
                className={cn(
                  "shrink-0",
                  active ? "text-white/40" : "text-stone-300",
                )}
              />
              <Box
                size={12}
                className={cn(
                  "shrink-0",
                  active ? "text-white" : "text-stone-400",
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium truncate leading-tight">
                  {title}
                </div>
                <div
                  className={cn(
                    "text-[10px] truncate font-mono leading-tight",
                    active ? "text-white/50" : "text-stone-400",
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
                      ? "hover:bg-white/10 text-white"
                      : "hover:bg-stone-200",
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
                      ? "hover:bg-white/10 text-white"
                      : "hover:bg-stone-200",
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
                      ? "hover:bg-white/10 text-white"
                      : "hover:bg-stone-200",
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
                      ? "hover:bg-white/10 text-white"
                      : "hover:bg-stone-200",
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
                      ? "hover:bg-white/10 text-white"
                      : "hover:bg-stone-200",
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

// --------------- Theme panel (stub with link to branding) ---------------
function ThemePanel({ workspaceSlug }: { workspaceSlug: string }) {
  return (
    <div className="flex flex-col h-full">
      <div className="h-11 px-3 flex items-center border-b border-stone-200 shrink-0">
        <span className="text-[13px] font-semibold text-stone-900">Theme</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <p className="text-[12px] text-stone-500 leading-relaxed">
          Colors, typography, and layout tokens are managed in the full branding
          panel.
        </p>
        <a
          href={`/${workspaceSlug}/settings/site`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border border-stone-200 text-[12.5px] font-medium text-stone-700 hover:bg-stone-50 transition-colors"
        >
          <Settings size={13} />
          Open Branding Settings
        </a>
      </div>
    </div>
  );
}

// --------------- Nav panel stub ---------------
function NavPanel({ workspaceSlug }: { workspaceSlug: string }) {
  return (
    <div className="flex flex-col h-full">
      <div className="h-11 px-3 flex items-center border-b border-stone-200 shrink-0">
        <span className="text-[13px] font-semibold text-stone-900">
          Navigation
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <p className="text-[12px] text-stone-500 leading-relaxed">
          Header menu and footer navigation links are managed in the Navigation
          settings.
        </p>
        <a
          href={`/${workspaceSlug}/settings/site/navigation`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border border-stone-200 text-[12.5px] font-medium text-stone-700 hover:bg-stone-50 transition-colors"
        >
          <Navigation size={13} />
          Open Navigation Settings
        </a>
      </div>
    </div>
  );
}

// --------------- Media panel stub ---------------
function MediaPanel() {
  return (
    <div className="flex flex-col h-full">
      <div className="h-11 px-3 flex items-center border-b border-stone-200 shrink-0">
        <span className="text-[13px] font-semibold text-stone-900 flex-1">
          Media
        </span>
        <button className="h-7 w-7 grid place-items-center rounded text-stone-400 hover:bg-stone-100 hover:text-stone-700">
          <Plus size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col items-center justify-center gap-2 h-32 rounded-lg border-2 border-dashed border-stone-200 text-[12px] text-stone-400 hover:border-stone-300 hover:bg-stone-50 cursor-pointer transition-colors">
          <Image size={20} className="opacity-40" />
          <span>Drop files or click to upload</span>
        </div>
      </div>
    </div>
  );
}

// --------------- Blog panel stub ---------------
function BlogPanel({ workspaceSlug }: { workspaceSlug: string }) {
  return (
    <div className="flex flex-col h-full">
      <div className="h-11 px-3 flex items-center border-b border-stone-200 shrink-0">
        <span className="text-[13px] font-semibold text-stone-900">Blog</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <p className="text-[12px] text-stone-500 leading-relaxed">
          Create and manage blog posts in the Blog settings.
        </p>
        <a
          href={`/${workspaceSlug}/settings/site/blog`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border border-stone-200 text-[12.5px] font-medium text-stone-700 hover:bg-stone-50 transition-colors"
        >
          <FileText size={13} />
          Open Blog Settings
        </a>
      </div>
    </div>
  );
}

// --------------- SEO panel stub ---------------
function SEOPanel({ workspaceSlug }: { workspaceSlug: string }) {
  return (
    <div className="flex flex-col h-full">
      <div className="h-11 px-3 flex items-center border-b border-stone-200 shrink-0">
        <span className="text-[13px] font-semibold text-stone-900">SEO</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <p className="text-[12px] text-stone-500 leading-relaxed">
          Meta titles, descriptions, and structured data are managed in the full
          SEO panel.
        </p>
        <a
          href={`/${workspaceSlug}/settings/site`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border border-stone-200 text-[12.5px] font-medium text-stone-700 hover:bg-stone-50 transition-colors"
        >
          <Globe size={13} />
          Open SEO Settings
        </a>
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

  // Workspace slug from path: /[workspace]/...
  const workspaceSlug = useMemo(() => pathname.split("/")[1] ?? "", [pathname]);

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
        } else if (/^[1-8]$/.test(e.key)) {
          const i = parseInt(e.key) - 1;
          if (RAIL[i]) setActivePanel(RAIL[i]!.id);
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
  const renderPanel = () => {
    switch (activePanel) {
      case "pages":
        return (
          <PagesPanel
            target={target}
            setTarget={setTarget}
            customPages={customPages.map((p) => ({ id: p.id, title: p.title }))}
          />
        );
      case "blocks":
        return <BlocksPanel onAdd={handleAddBlock} />;
      case "layers":
        return <LayersPanel blocks={blocks} selectedId={selectedId} />;
      case "theme":
        return <ThemePanel workspaceSlug={workspaceSlug} />;
      case "nav":
        return <NavPanel workspaceSlug={workspaceSlug} />;
      case "media":
        return <MediaPanel />;
      case "blog":
        return <BlogPanel workspaceSlug={workspaceSlug} />;
      case "seo":
        return <SEOPanel workspaceSlug={workspaceSlug} />;
    }
  };

  // ---- Shell ----
  const shell = (
    <div
      className="flex flex-col overflow-hidden bg-white"
      style={{ height: fullScreen ? "100dvh" : "calc(100vh - 4rem)" }}
    >
      {/* ── Top bar ── */}
      <div className="h-12 border-b border-stone-200 bg-white flex items-center gap-2 px-3 shrink-0 z-20">
        {/* Site info */}
        <div className="flex items-center gap-1.5 mr-1">
          <div className="h-7 w-7 rounded-md grid place-items-center bg-stone-100">
            <Globe size={14} className="text-stone-700" />
          </div>
          <div className="text-[13px] font-semibold text-stone-900 leading-none">
            {(configQuery.data?.branding as { name?: string } | null)?.name ??
              "Your site"}
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

        {/* Editing label */}
        <div className="flex items-center gap-1.5 text-[12px]">
          <span className="text-stone-400">Editing</span>
          <button
            onClick={() => setActivePanel("pages")}
            className="flex items-center gap-1.5 h-7 px-2 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium text-[12px] transition-colors"
          >
            <Hash size={11} />
            {scopeLabel}
          </button>
        </div>

        <div className="flex-1" />

        {/* Device switcher */}
        <div className="flex items-center bg-stone-100 rounded-md p-0.5 gap-0.5">
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
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500 hover:text-stone-900",
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
            className="h-7 px-2 rounded text-[11px] font-mono text-stone-600 hover:bg-stone-100 transition-colors"
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
          className="flex items-center gap-1.5 h-7 px-2.5 rounded bg-stone-100 hover:bg-stone-200 text-[12px] text-stone-600 transition-colors"
        >
          <Search size={11} />
          <span className="hidden lg:inline">Quick add</span>
          <kbd className="hidden lg:inline text-[10px] px-1 py-0.5 rounded border border-stone-300 bg-white text-stone-400 font-mono">
            ⌘K
          </kbd>
        </button>

        <IconBtn
          tooltip="Keyboard shortcuts (?)"
          onClick={() => setShortcutsOpen(true)}
        >
          <Keyboard size={13} />
        </IconBtn>

        {/* Save indicator */}
        <div className="hidden md:flex items-center gap-1.5 mx-1 text-[11px] text-stone-400 font-mono">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              dirty ? "bg-amber-400" : "bg-emerald-400",
            )}
          />
          {saveDraft.isPending ? "Saving…" : savedAgo}
        </div>

        {/* Preview */}
        {previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 px-3 rounded-md border border-stone-200 text-[12px] font-medium text-stone-700 hover:bg-stone-50 flex items-center gap-1.5 transition-colors"
          >
            <Eye size={12} />
            Preview
          </a>
        )}

        {/* Publish */}
        <button
          onClick={() => setPublishOpen(true)}
          className="h-8 px-3.5 rounded-md text-[12.5px] font-semibold text-white flex items-center gap-1.5 shadow-sm hover:opacity-90 transition-opacity"
          style={{ background: ACCENT }}
        >
          <Rocket size={12} />
          Publish
        </button>
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* ── Icon Rail ── */}
        <div className="w-14 h-full border-r border-stone-200 bg-white flex flex-col items-center py-2 gap-1 shrink-0">
          {RAIL.map((item) => {
            const ItemIcon = item.Icon;
            return (
              <button
                key={item.id}
                title={`${item.label} (${item.kbd})`}
                onClick={() => setActivePanel(item.id)}
                className={cn(
                  "h-10 w-10 rounded-lg grid place-items-center transition-colors relative",
                  activePanel === item.id
                    ? "bg-stone-900 text-white"
                    : "text-stone-400 hover:bg-stone-100 hover:text-stone-900",
                )}
              >
                <ItemIcon size={18} />
              </button>
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

        {/* ── Secondary panel ── */}
        <div className="w-72 border-r border-stone-200 bg-white shrink-0 overflow-hidden flex flex-col">
          {renderPanel()}
        </div>

        {/* ── Canvas ── */}
        <div
          className="flex-1 overflow-auto relative"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            backgroundColor: "#f5f5f4",
          }}
          onClick={() => setSelected(null)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onCanvasDrop}
        >
          <div className="min-h-full py-8 px-6 flex flex-col items-center">
            <div
              className="origin-top transition-transform"
              style={{
                transform: `scale(${zoom})`,
                width: DEVICES[device].w,
                transformOrigin: "top center",
              }}
            >
              <div className="bg-white shadow-xl rounded-md overflow-hidden border border-stone-200">
                {blocks.length === 0 ? (
                  <div
                    className="py-24 px-8 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Box size={32} className="mx-auto mb-3 text-stone-300" />
                    <div className="text-[14px] font-medium text-stone-700 mb-1">
                      Empty {scopeLabel.toLowerCase()}
                    </div>
                    <div className="text-[12px] text-stone-400 mb-5">
                      Drag blocks from the panel, or press{" "}
                      <kbd className="text-[11px] px-1.5 py-0.5 rounded border border-stone-200 bg-white font-mono">
                        ⌘K
                      </kbd>{" "}
                      to search.
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
                        className="h-8 px-3 rounded-md border border-stone-200 text-[12px] font-medium text-stone-700 hover:bg-stone-50 flex items-center gap-1.5"
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
                  />
                )}
              </div>
              <div className="text-center pt-2 pb-1 text-[10px] font-mono text-stone-400 uppercase tracking-wider">
                {device} · {DEVICES[device].w}px · {Math.round(zoom * 100)}%
              </div>
            </div>
          </div>
        </div>

        {/* ── Right inspector ── */}
        <div className="w-80 border-l border-stone-200 bg-white shrink-0 overflow-hidden flex flex-col">
          <BlockInspector />
        </div>
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
    </div>
  );

  // When not fullScreen, just render the shell (it's embedded in admin layout)
  if (!fullScreen) return shell;

  // fullScreen: rendered outside admin layout, so it naturally fills viewport
  return shell;
}
