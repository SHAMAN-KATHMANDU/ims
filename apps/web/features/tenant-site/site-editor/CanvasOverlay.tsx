"use client";

/**
 * CanvasOverlay — parent-side overlay used in CROSS-ORIGIN iframe mode.
 *
 * When the tenant-site is served from a different origin (e.g. custom domain
 * in production), PreviewFrame cannot portal the BlockOverlay into the iframe
 * body. Instead:
 *   1. EditorBridge (inside the iframe) posts click/hover events with the
 *      block's bounding rect in iframe-document coordinates.
 *   2. PreviewFrame's message handler stores those rects in the editor store.
 *   3. CanvasOverlay (rendered as a sibling to the iframe in PreviewFrame)
 *      reads those rects and draws outlines translated to parent-document
 *      coordinates by adding the iframe element's own bounding rect.
 *
 * For SAME-ORIGIN iframes, the existing `BlockOverlay` portaled into the
 * iframe body is used instead — CanvasOverlay renders nothing in that case.
 *
 * Layout invariant: the overlay container is sized + positioned to match the
 * iframe's bounding rect EXACTLY, with `overflow: hidden` so any outline that
 * would extend past the iframe is clipped to the iframe's visible viewport.
 * The container's rect is recomputed reactively on iframe scroll, parent
 * scroll, window resize, and ResizeObserver — all rAF-throttled.
 */

import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import {
  selectHoveredBlockRect,
  selectSelectedBlockRect,
  useEditorStore,
} from "./editor-store";

interface Props {
  /**
   * Ref to the `<iframe>` element — used to translate iframe-document
   * coordinates into parent-document coordinates.
   */
  iframeRef: RefObject<HTMLIFrameElement | null>;
}

interface IframeBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

const ZERO_BOX: IframeBox = { top: 0, left: 0, width: 0, height: 0 };

/**
 * Track the iframe's bounding rect reactively. Returns the latest rect, kept
 * in sync via `requestAnimationFrame`-throttled listeners on:
 *   - parent window scroll  (sticky/scrollable editor frames)
 *   - parent window resize  (responsive layouts)
 *   - ResizeObserver(iframe) (DevTools docked, parent layout shifts)
 *   - iframe contentWindow scroll (catches in-iframe scroll for completeness;
 *     not strictly required — we clip with overflow: hidden — but keeps
 *     hover/selection rects stable when the user scrolls inside the iframe)
 */
function useIframeBox(
  iframeRef: RefObject<HTMLIFrameElement | null>,
): IframeBox {
  const [box, setBox] = useState<IframeBox>(ZERO_BOX);
  const rafRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = iframeRef.current;
    if (!el) return;

    const recompute = () => {
      rafRef.current = null;
      const r = el.getBoundingClientRect();
      setBox((prev) =>
        prev.top === r.top &&
        prev.left === r.left &&
        prev.width === r.width &&
        prev.height === r.height
          ? prev
          : { top: r.top, left: r.left, width: r.width, height: r.height },
      );
    };

    const schedule = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(recompute);
    };

    // Initial measure
    recompute();

    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);

    const ro = new ResizeObserver(schedule);
    ro.observe(el);

    // Best-effort iframe-scroll listener (same-origin only; cross-origin will
    // throw on access — caught and ignored).
    let iframeWin: Window | null = null;
    try {
      iframeWin = el.contentWindow ?? null;
      iframeWin?.addEventListener("scroll", schedule, true);
    } catch {
      iframeWin = null;
    }

    return () => {
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      ro.disconnect();
      try {
        iframeWin?.removeEventListener("scroll", schedule, true);
      } catch {
        /* ignore cross-origin */
      }
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [iframeRef]);

  return box;
}

export function CanvasOverlay({ iframeRef }: Props) {
  const hoveredRect = useEditorStore(selectHoveredBlockRect);
  const selectedRect = useEditorStore(selectSelectedBlockRect);
  const ifBox = useIframeBox(iframeRef);

  // Nothing to show — skip rendering entirely.
  if (!hoveredRect && !selectedRect) return null;
  if (ifBox.width === 0 || ifBox.height === 0) return null;

  return (
    // The container is sized + positioned to match the iframe's bounding rect
    // exactly. `overflow: hidden` clips any child outline that would extend
    // past the iframe's visible viewport, so a tall block's selection ring
    // never bleeds onto the editor chrome.
    <div
      style={{
        position: "fixed",
        top: ifBox.top,
        left: ifBox.left,
        width: ifBox.width,
        height: ifBox.height,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 50,
      }}
      aria-hidden="true"
    >
      {hoveredRect && (
        <div
          style={{
            position: "absolute",
            top: hoveredRect.y,
            left: hoveredRect.x,
            width: hoveredRect.width,
            height: hoveredRect.height,
            outline: "1.5px dashed oklch(0.62 0.08 150 / 0.55)",
            outlineOffset: -1,
          }}
        />
      )}
      {selectedRect && (
        <div
          style={{
            position: "absolute",
            top: selectedRect.y,
            left: selectedRect.x,
            width: selectedRect.width,
            height: selectedRect.height,
            outline: "2px solid oklch(0.62 0.08 150)",
            outlineOffset: 0,
          }}
        />
      )}
    </div>
  );
}
