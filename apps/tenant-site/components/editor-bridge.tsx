"use client";

/**
 * EditorBridge — postMessage bridge between the tenant-site preview iframe
 * and the parent site-editor (apps/web).
 *
 * Mounted only when the page is loaded with the `?_editor=1` query flag that
 * PreviewFrame appends to the iframe src. When active it:
 *
 *   iframe → parent (click/hover):
 *     • Attaches a single delegated `click` listener on `document` (capture).
 *       Walks up to the nearest `[data-block-id]`, prevents default navigation,
 *       and posts `{ type: 'editor:select-block', blockId, rect }` to the parent.
 *     • Attaches delegated `mouseover`/`mouseout` (capture, RAF-throttled) and
 *       posts `{ type: 'editor:hover-block', blockId, rect }` so the parent can
 *       render a hover outline even when cross-origin.
 *     • On scroll/resize, reposts the current hovered block's rect so the
 *       parent overlay tracks correctly.
 *
 * The component renders null — no DOM output.
 */

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Toggle on by setting `localStorage.setItem("site-editor:debug", "1")` in
 * either the editor (parent) or the iframe devtools, then reload. Logs trace
 * each step of the click → postMessage → store-update path so the first
 * silent link can be pinpointed.
 */
const DEBUG = (() => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("site-editor:debug") === "1";
  } catch {
    return false;
  }
})();

function debugLog(...args: unknown[]): void {
  if (!DEBUG) return;
  // eslint-disable-next-line no-console
  console.log("[site-editor:bridge]", ...args);
}

export function EditorBridge() {
  const searchParams = useSearchParams();
  const isEditorMode = searchParams.has("_editor");

  useEffect(() => {
    if (!isEditorMode) return;
    debugLog("mount", { href: window.location.href });

    let rafId: number | null = null;
    let lastHoveredEl: HTMLElement | null = null;
    let lastSelectedEl: HTMLElement | null = null;

    /** Posts a typed block event to the parent window. */
    function postBlock(
      type: "editor:select-block" | "editor:hover-block",
      el: HTMLElement | null,
    ): void {
      if (!el) {
        debugLog("post", type, "blockId=null");
        window.parent.postMessage({ type, blockId: null, rect: null }, "*");
        return;
      }
      const blockId = el.dataset.blockId;
      if (!blockId) {
        debugLog("post-skip: el has no data-block-id", el);
        return;
      }
      const rect = el.getBoundingClientRect();
      debugLog("post", type, blockId);
      window.parent.postMessage({ type, blockId, rect: rect.toJSON() }, "*");
    }

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const el = target?.closest?.("[data-block-id]") as HTMLElement | null;
      debugLog("click", {
        target: target?.tagName,
        targetClasses: target?.className,
        matchedBlock: el?.dataset?.blockId ?? null,
      });
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      lastSelectedEl = el;
      postBlock("editor:select-block", el);
    };

    const onMouseOver = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.(
        "[data-block-id]",
      ) as HTMLElement | null;
      if (el === lastHoveredEl) return;
      lastHoveredEl = el;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        postBlock("editor:hover-block", lastHoveredEl);
        rafId = null;
      });
    };

    const onMouseOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      // Still hovering a block — ignore
      if (related?.closest?.("[data-block-id]")) return;
      lastHoveredEl = null;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      window.parent.postMessage(
        { type: "editor:hover-block", blockId: null, rect: null },
        "*",
      );
    };

    /**
     * On scroll/resize, repost the hovered AND selected rects so the parent
     * overlays stay aligned with their blocks. The selected rect is otherwise
     * captured once at click time and would drift away on scroll.
     */
    const onScrollOrResize = () => {
      if (!lastHoveredEl && !lastSelectedEl) return;
      const hoveredCapture = lastHoveredEl;
      const selectedCapture = lastSelectedEl;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (hoveredCapture) postBlock("editor:hover-block", hoveredCapture);
        if (selectedCapture?.isConnected)
          postBlock("editor:select-block", selectedCapture);
        rafId = null;
      });
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("mouseover", onMouseOver, true);
    document.addEventListener("mouseout", onMouseOut, true);
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("mouseover", onMouseOver, true);
      document.removeEventListener("mouseout", onMouseOut, true);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [isEditorMode]);

  return null;
}
