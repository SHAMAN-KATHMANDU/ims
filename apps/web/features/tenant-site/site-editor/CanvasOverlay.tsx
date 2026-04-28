"use client";

/**
 * CanvasOverlay — parent-side absolutely-positioned overlay used in
 * CROSS-ORIGIN iframe mode.
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
 */

import { type RefObject } from "react";
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

export function CanvasOverlay({ iframeRef }: Props) {
  const hoveredRect = useEditorStore(selectHoveredBlockRect);
  const selectedRect = useEditorStore(selectSelectedBlockRect);

  // Nothing to show — skip rendering entirely.
  if (!hoveredRect && !selectedRect) return null;

  const iframeEl = iframeRef.current;
  if (!iframeEl) return null;

  // Iframe's bounding rect in parent-document space.
  // getBoundingClientRect() is safe to call in render for read-only use.
  const ifBounds = iframeEl.getBoundingClientRect();

  /**
   * Translates an iframe-document rect to parent-document `position: fixed`
   * coordinates.
   */
  function toFixed(rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) {
    return {
      top: ifBounds.top + rect.y,
      left: ifBounds.left + rect.x,
      width: rect.width,
      height: rect.height,
    };
  }

  return (
    // Use `position: fixed` so the outlines are always in the viewport
    // regardless of any scroll on the parent page.
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 50,
      }}
      aria-hidden="true"
    >
      {hoveredRect && (
        <div
          style={{
            position: "absolute",
            ...toFixed(hoveredRect),
            outline: "1.5px dashed oklch(0.62 0.08 150 / 0.55)",
            outlineOffset: -1,
          }}
        />
      )}
      {selectedRect && (
        <div
          style={{
            position: "absolute",
            ...toFixed(selectedRect),
            outline: "2px solid oklch(0.62 0.08 150)",
            outlineOffset: 0,
          }}
        />
      )}
    </div>
  );
}
