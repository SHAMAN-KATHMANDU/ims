"use client";

/**
 * PreviewFrame — center pane of the editor.
 *
 * Iframes the tenant-site at /preview/site/<scope>?token=... and exposes a
 * responsive width toggle (desktop / tablet / mobile). The `refreshKey`
 * prop is bumped by the parent after a save so the iframe reloads with
 * the new draft.
 *
 * Same-origin enhancement: when the iframe shares origin with the editor,
 * we inject an overlay CSS into its documentElement so blocks get a hover
 * outline and the currently-selected block shows a solid sage outline.
 * Click handlers on `[data-block-id]` elements bubble up to select in the
 * parent store. If cross-origin, these enhancements silently no-op.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  Monitor,
  Smartphone,
  Tablet,
  RefreshCw,
  ExternalLink,
  Grid3X3,
  GripVertical,
  Plus,
} from "lucide-react";

type DeviceWidth = "desktop" | "tablet" | "mobile";

const WIDTHS: Record<DeviceWidth, { width: number; label: string }> = {
  desktop: { width: 1280, label: "Desktop" },
  tablet: { width: 820, label: "Tablet" },
  mobile: { width: 390, label: "Mobile" },
};

type Props = {
  previewUrl: string | null;
  loading: boolean;
  refreshKey: number;
  onRefresh: () => void;
  device: DeviceWidth;
  onDeviceChange: (device: DeviceWidth) => void;
  /**
   * When scope is `product-detail`, the iframe needs a concrete productId so
   * the preview service can hydrate activeProduct/relatedProducts. The editor
   * owns this state (see SiteEditorPage) and forwards it here.
   */
  productId?: string | null;
  /** Block id currently selected in the editor store. */
  selectedId?: string | null;
  /** Called when the user clicks a block inside the iframe. */
  onBlockSelect?: (id: string | null) => void;
  /** Called when the user commits an inline text edit. */
  onInlineEdit?: (blockId: string, field: string, value: string) => void;
  /** Called when a block is drag-reordered on the canvas. */
  onReorder?: (blockId: string, toIndex: number) => void;
  /** Called when a palette-dragged block is dropped on a canvas drop zone. */
  onInsertAt?: (kind: string, atIndex: number) => void;
};

type BlockRect = {
  id: string;
  top: number;
  left: number;
  width: number;
  height: number;
};

const EDITOR_OVERLAY_STYLE_ID = "__editor_block_overlay__";
const EDITOR_OVERLAY_CSS = `
  [data-block-id] { position: relative; }
  [data-block-id]:hover {
    outline: 1.5px dashed oklch(0.62 0.08 150 / 0.55);
    outline-offset: -1px;
    cursor: pointer;
  }
  [data-editor-selected="true"] {
    outline: 2px solid oklch(0.62 0.08 150) !important;
    outline-offset: -2px !important;
    box-shadow: 0 0 0 4px oklch(0.62 0.08 150 / 0.12);
  }
  /* Disable all link navigation inside the editor preview */
  a { pointer-events: none; }
  /* But keep clicks on the block wrappers themselves working */
  [data-block-id] { pointer-events: auto; }
  /* Inline-edit targets: must be clickable even inside disabled <a> wrappers */
  [data-editable-text] { pointer-events: auto; cursor: text; }
  [data-editable-text]:hover {
    box-shadow: inset 0 -2px 0 oklch(0.62 0.08 150 / 0.35);
  }
  [data-editor-editing="true"] {
    outline: 2px solid oklch(0.62 0.08 150);
    outline-offset: 2px;
    cursor: text;
    background: oklch(0.62 0.08 150 / 0.04);
  }
  /* Don't double-outline the block wrapper when a child is being edited */
  [data-block-id]:has([data-editor-editing="true"]) {
    outline: none !important;
    box-shadow: none !important;
  }
  /* Editor overlay (portaled into iframe body) — visual-only; pointer-events per-element */
  [data-editor-overlay-root] {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    pointer-events: none;
    z-index: 999;
  }
  [data-editor-overlay-root] * { box-sizing: border-box; }
`;

/**
 * Observes block positions inside the iframe and returns them in
 * iframe-document coordinates (top-left of contentDocument = 0,0).
 * Re-measures on mutations, resizes, and iframe scroll.
 */
function useIframeBlockRects(
  iframeRef: React.RefObject<HTMLIFrameElement | null>,
  iframeReady: number,
): BlockRect[] {
  const [rects, setRects] = useState<BlockRect[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const frame = iframeRef.current;
    if (!frame) return;
    let disposed = false;
    let mo: MutationObserver | null = null;
    let ro: ResizeObserver | null = null;
    let doc: Document | null = null;

    const recompute = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (disposed) return;
        try {
          const d = frame.contentDocument;
          if (!d) return;
          const win = frame.contentWindow;
          if (!win) return;
          // Only include TOP-LEVEL blocks so we don't render handles for
          // nested children (section > columns > child block).
          const all = Array.from(
            d.querySelectorAll<HTMLElement>("[data-block-id]"),
          );
          const topLevel = all.filter(
            (el) => !el.parentElement?.closest("[data-block-id]"),
          );
          const scrollX = win.scrollX || 0;
          const scrollY = win.scrollY || 0;
          const next: BlockRect[] = topLevel.map((el) => {
            const r = el.getBoundingClientRect();
            const id = el.getAttribute("data-block-id") || "";
            return {
              id,
              top: r.top + scrollY,
              left: r.left + scrollX,
              width: r.width,
              height: r.height,
            };
          });
          setRects((prev) => {
            if (prev.length !== next.length) return next;
            for (let i = 0; i < next.length; i++) {
              const a = prev[i]!;
              const b = next[i]!;
              if (
                a.id !== b.id ||
                Math.abs(a.top - b.top) > 0.5 ||
                Math.abs(a.left - b.left) > 0.5 ||
                Math.abs(a.width - b.width) > 0.5 ||
                Math.abs(a.height - b.height) > 0.5
              )
                return next;
            }
            return prev;
          });
        } catch {
          // cross-origin — skip
        }
      });
    };

    try {
      doc = frame.contentDocument;
      if (!doc) return;
      const body = doc.body;
      if (!body) return;
      mo = new MutationObserver(recompute);
      mo.observe(body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-block-id", "style", "class"],
      });
      ro = new ResizeObserver(recompute);
      ro.observe(body);
      const win = frame.contentWindow;
      win?.addEventListener("scroll", recompute, { passive: true });
      win?.addEventListener("resize", recompute);
      // Initial pass
      recompute();

      return () => {
        disposed = true;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        mo?.disconnect();
        ro?.disconnect();
        win?.removeEventListener("scroll", recompute);
        win?.removeEventListener("resize", recompute);
      };
    } catch {
      // cross-origin — skip
      return;
    }
  }, [iframeRef, iframeReady]);

  return rects;
}

type OverlayProps = {
  rects: BlockRect[];
  selectedId?: string | null;
  onReorder?: (blockId: string, toIndex: number) => void;
  onInsertAt?: (kind: string, atIndex: number) => void;
};

/**
 * The overlay lives inside the iframe body (portaled). Positions are in
 * iframe-document coords — blocks getBoundingClientRect + scrollY. Since the
 * overlay root is absolutely positioned with `inset: 0`, children positioned
 * at `top: block.top` land exactly over each block.
 */
function BlockOverlay({
  rects,
  selectedId,
  onReorder,
  onInsertAt,
}: OverlayProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Clamp hover state when rects change and the hovered id disappears.
  useEffect(() => {
    if (hoverId && !rects.some((r) => r.id === hoverId)) setHoverId(null);
  }, [rects, hoverId]);

  const n = rects.length;
  // Drop zones sit between blocks and at the boundaries. For n blocks we
  // render n+1 zones (index 0 = before first, index n = after last).
  const zoneTop = (i: number): number => {
    if (i === 0) return Math.max(0, (rects[0]?.top ?? 0) - 6);
    if (i === n) {
      const last = rects[n - 1];
      return last ? last.top + last.height - 6 : 0;
    }
    const above = rects[i - 1]!;
    const below = rects[i]!;
    const gapMid = (above.top + above.height + below.top) / 2;
    return gapMid - 6;
  };
  const zoneRect = (i: number): { left: number; width: number } => {
    const r = rects[Math.min(i, n - 1)] ?? rects[0];
    return r ? { left: r.left, width: r.width } : { left: 0, width: 0 };
  };

  const handleDropOnZone = (i: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);
    const reorderId = e.dataTransfer.getData("application/x-editor-reorder");
    if (reorderId) {
      // Compute adjusted target index: if source is before target, target decrements.
      const fromIdx = rects.findIndex((r) => r.id === reorderId);
      let toIdx = i;
      if (fromIdx >= 0 && fromIdx < i) toIdx = i - 1;
      onReorder?.(reorderId, toIdx);
      return;
    }
    const kind = e.dataTransfer.getData("block-kind");
    if (kind) {
      onInsertAt?.(kind, i);
    }
  };

  return (
    <div data-editor-overlay-root>
      {/* Grip handles — one per top-level block, on hover/selected */}
      {rects.map((r) => {
        const active = r.id === hoverId || r.id === selectedId;
        return (
          <div
            key={`grip-${r.id}`}
            onMouseEnter={() => setHoverId(r.id)}
            onMouseLeave={() => setHoverId(null)}
            style={{
              position: "absolute",
              top: r.top,
              left: r.left,
              width: r.width,
              height: r.height,
              pointerEvents: "none",
            }}
          >
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/x-editor-reorder", r.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              title="Drag to reorder"
              style={{
                position: "absolute",
                top: 8,
                left: -28,
                width: 22,
                height: 26,
                display: "grid",
                placeItems: "center",
                borderRadius: 6,
                background: "oklch(0.62 0.08 150)",
                color: "#fff",
                cursor: "grab",
                boxShadow: "0 2px 8px oklch(0 0 0 / 0.15)",
                opacity: active ? 1 : 0,
                transition: "opacity 120ms ease",
                pointerEvents: active ? "auto" : "none",
                zIndex: 2,
              }}
            >
              <GripVertical size={13} />
            </div>
          </div>
        );
      })}

      {/* Drop zones — between every pair plus one above/below */}
      {Array.from({ length: n + 1 }).map((_, i) => {
        const top = zoneTop(i);
        const { left, width } = zoneRect(Math.min(i, n - 1));
        const active = dragOverIndex === i;
        return (
          <div
            key={`zone-${i}`}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOverIndex(i);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragOverIndex !== i) setDragOverIndex(i);
              // 'move' for reorder, 'copy' for palette — browser decides.
              e.dataTransfer.dropEffect = e.dataTransfer.types.includes(
                "application/x-editor-reorder",
              )
                ? "move"
                : "copy";
            }}
            onDragLeave={() => {
              // Clear only if we're leaving THIS zone (not a child)
              setDragOverIndex((cur) => (cur === i ? null : cur));
            }}
            onDrop={handleDropOnZone(i)}
            style={{
              position: "absolute",
              top,
              left: left - 4,
              width: width + 8,
              height: 12,
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "100%",
                height: active ? 4 : 2,
                borderRadius: 2,
                background: active ? "oklch(0.62 0.08 150)" : "transparent",
                transition: "height 120ms ease, background 120ms ease",
              }}
            />
            {active && (
              <div
                style={{
                  position: "absolute",
                  display: "grid",
                  placeItems: "center",
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "oklch(0.62 0.08 150)",
                  color: "#fff",
                  boxShadow: "0 2px 6px oklch(0 0 0 / 0.2)",
                }}
              >
                <Plus size={12} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PreviewFrame({
  previewUrl,
  loading,
  refreshKey,
  onRefresh,
  device,
  onDeviceChange,
  productId,
  selectedId,
  onBlockSelect,
  onInlineEdit,
  onReorder,
  onInsertAt,
}: Props) {
  const [showGrid, setShowGrid] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeReady, setIframeReady] = useState(0);

  const src = useMemo(() => {
    if (!previewUrl) return null;
    const u = new URL(previewUrl);
    u.searchParams.set("_r", String(refreshKey));
    if (showGrid) u.searchParams.set("grid", "1");
    if (productId) u.searchParams.set("productId", productId);
    return u.toString();
  }, [previewUrl, refreshKey, showGrid, productId]);

  // Inject editor overlay CSS + click-to-select handler on every iframe load.
  // Tries same-origin access; silently no-ops if cross-origin.
  useEffect(() => {
    const frame = iframeRef.current;
    if (!frame) return;
    let clickHandler: ((e: Event) => void) | null = null;
    let dblclickHandler: ((e: Event) => void) | null = null;

    const tryInject = () => {
      try {
        const doc = frame.contentDocument;
        if (!doc) return false;

        // Style tag
        if (!doc.getElementById(EDITOR_OVERLAY_STYLE_ID)) {
          const style = doc.createElement("style");
          style.id = EDITOR_OVERLAY_STYLE_ID;
          style.textContent = EDITOR_OVERLAY_CSS;
          doc.head.appendChild(style);
        }

        // Delegated click handler — selects the block, but skips clicks that
        // originated inside an actively-editing text element.
        clickHandler = (e: Event) => {
          const target = e.target as HTMLElement | null;
          if (!target) return;
          if (target.closest('[data-editor-editing="true"]')) return;
          const blockEl = target.closest(
            "[data-block-id]",
          ) as HTMLElement | null;
          if (!blockEl) return;
          const id = blockEl.getAttribute("data-block-id");
          if (id) {
            e.preventDefault();
            e.stopPropagation();
            onBlockSelect?.(id);
          }
        };
        doc.addEventListener("click", clickHandler, true);

        // Delegated dblclick → activate inline editing on the nearest
        // [data-editable-text] element.
        dblclickHandler = (e: Event) => {
          const target = e.target as HTMLElement | null;
          if (!target) return;
          const el = target.closest(
            "[data-editable-text]",
          ) as HTMLElement | null;
          if (!el) return;
          const blockEl = el.closest("[data-block-id]") as HTMLElement | null;
          if (!blockEl) return;
          const blockId = blockEl.getAttribute("data-block-id");
          const field = el.getAttribute("data-editable-text");
          if (!blockId || !field) return;

          e.preventDefault();
          e.stopPropagation();

          // Already editing this element? No-op.
          if (el.getAttribute("data-editor-editing") === "true") return;

          const original = el.innerText;
          el.setAttribute("contenteditable", "true");
          el.setAttribute("data-editor-editing", "true");
          el.focus();

          // Select all text inside the element for quick replace.
          try {
            const sel = doc.getSelection();
            const range = doc.createRange();
            range.selectNodeContents(el);
            sel?.removeAllRanges();
            sel?.addRange(range);
          } catch {
            // ignore
          }

          let committed = false;
          const finish = (commit: boolean) => {
            if (committed) return;
            committed = true;
            el.removeAttribute("contenteditable");
            el.removeAttribute("data-editor-editing");
            const next = el.innerText;
            if (commit) {
              if (next !== original) {
                onInlineEdit?.(blockId, field, next);
              }
            } else {
              el.innerText = original;
            }
          };

          const onBlur = () => finish(true);
          const onKey = (ke: KeyboardEvent) => {
            if (ke.key === "Enter" && !ke.shiftKey) {
              ke.preventDefault();
              el.blur();
            } else if (ke.key === "Escape") {
              ke.preventDefault();
              finish(false);
              el.blur();
            }
          };

          el.addEventListener("blur", onBlur, { once: true });
          el.addEventListener("keydown", onKey);
          // Cleanup the keydown listener after blur fires
          el.addEventListener(
            "blur",
            () => el.removeEventListener("keydown", onKey),
            { once: true },
          );
        };
        doc.addEventListener("dblclick", dblclickHandler, true);

        setIframeReady((x) => x + 1);
        return true;
      } catch {
        // cross-origin — can't inject
        return false;
      }
    };

    const onLoad = () => {
      tryInject();
    };
    frame.addEventListener("load", onLoad);
    // Also try immediately in case it's already loaded
    tryInject();

    return () => {
      frame.removeEventListener("load", onLoad);
      try {
        const doc = frame.contentDocument;
        if (doc) {
          if (clickHandler)
            doc.removeEventListener("click", clickHandler, true);
          if (dblclickHandler)
            doc.removeEventListener("dblclick", dblclickHandler, true);
        }
      } catch {
        // ignore
      }
    };
    // refreshKey and src both reload the iframe — re-inject on either.
  }, [src, refreshKey, onBlockSelect, onInlineEdit]);

  // Keep iframe's data-editor-selected attribute in sync with parent selection.
  useEffect(() => {
    const frame = iframeRef.current;
    if (!frame) return;
    try {
      const doc = frame.contentDocument;
      if (!doc) return;
      doc.querySelectorAll("[data-editor-selected]").forEach((el) => {
        el.removeAttribute("data-editor-selected");
      });
      if (selectedId) {
        const el = doc.querySelector(
          `[data-block-id="${CSS.escape(selectedId)}"]`,
        );
        if (el) el.setAttribute("data-editor-selected", "true");
      }
    } catch {
      // cross-origin — skip
    }
  }, [selectedId, iframeReady]);

  // Live block rects + overlay portal target.
  const blockRects = useIframeBlockRects(iframeRef, iframeReady);
  const [overlayTarget, setOverlayTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    try {
      const body = iframeRef.current?.contentDocument?.body ?? null;
      setOverlayTarget(body);
    } catch {
      setOverlayTarget(null);
    }
  }, [iframeReady]);

  // Make the iframe body `position: relative` so absolute-positioned overlay
  // children use the body as their containing block.
  useEffect(() => {
    try {
      const body = iframeRef.current?.contentDocument?.body;
      if (!body) return;
      const prev = body.style.position;
      if (prev !== "relative") body.style.position = "relative";
    } catch {
      // ignore
    }
  }, [iframeReady]);

  const stableOnReorder = useCallback(
    (id: string, toIndex: number) => {
      onReorder?.(id, toIndex);
    },
    [onReorder],
  );
  const stableOnInsertAt = useCallback(
    (kind: string, atIndex: number) => {
      onInsertAt?.(kind, atIndex);
    },
    [onInsertAt],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1">
          <DeviceButton
            active={device === "desktop"}
            onClick={() => onDeviceChange("desktop")}
            label="Desktop"
          >
            <Monitor className="h-4 w-4" aria-hidden="true" />
          </DeviceButton>
          <DeviceButton
            active={device === "tablet"}
            onClick={() => onDeviceChange("tablet")}
            label="Tablet"
          >
            <Tablet className="h-4 w-4" aria-hidden="true" />
          </DeviceButton>
          <DeviceButton
            active={device === "mobile"}
            onClick={() => onDeviceChange("mobile")}
            label="Mobile"
          >
            <Smartphone className="h-4 w-4" aria-hidden="true" />
          </DeviceButton>
          <DeviceButton
            active={showGrid}
            onClick={() => setShowGrid((v) => !v)}
            label="Toggle grid overlay"
          >
            <Grid3X3 className="h-4 w-4" aria-hidden="true" />
          </DeviceButton>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            disabled={!previewUrl}
          >
            <RefreshCw className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Refresh
          </Button>
          {src && (
            <Button size="sm" variant="ghost" asChild>
              <a href={src} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                Open
              </a>
            </Button>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-muted/30 p-4">
        <div
          className="mx-auto h-full overflow-hidden rounded-md border border-border bg-background shadow-sm transition-all"
          style={{ maxWidth: WIDTHS[device].width }}
        >
          {loading && (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Preparing preview…
            </div>
          )}
          {!loading && !src && (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
              <p>Preview unavailable.</p>
              <p className="text-xs">
                Ensure your site has a verified domain or{" "}
                <code>TENANT_SITE_PUBLIC_URL</code> is set.
              </p>
            </div>
          )}
          {!loading && src && (
            <iframe
              ref={iframeRef}
              key={refreshKey}
              src={src}
              title="Site preview"
              className="h-full w-full"
              style={{ border: "none", minHeight: "calc(100vh - 200px)" }}
              // `allow-same-origin` lets the preview route set its own
              // cookies (needed so the cart/hydration works in the iframe);
              // `allow-scripts` lets client blocks run.
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            />
          )}
          {/* Drag overlay — portaled into the iframe body so it scrolls with
              the content. Renders grip handles + insertion drop zones. */}
          {overlayTarget &&
            createPortal(
              <BlockOverlay
                rects={blockRects}
                selectedId={selectedId}
                onReorder={stableOnReorder}
                onInsertAt={stableOnInsertAt}
              />,
              overlayTarget,
            )}
        </div>
        {!loading && src && (
          <div className="mx-auto mt-2 max-w-2xl text-center text-[11px] text-muted-foreground">
            If the preview is blank, your tenant-site deployment may be behind
            this branch or the frame ancestor allowlist hasn&apos;t been widened
            —{" "}
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              open in a new tab
            </a>{" "}
            to verify the draft renders end-to-end.
          </div>
        )}
      </div>
    </div>
  );
}

function DeviceButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      size="sm"
      variant={active ? "default" : "ghost"}
      onClick={onClick}
      aria-label={label}
      className="h-8 w-8 p-0"
    >
      {children}
    </Button>
  );
}
