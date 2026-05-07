"use client";

/**
 * EditorPreviewShell — client-side shell for the site-editor preview iframe.
 *
 * Listens for two parent-side message shapes and triggers a server-side
 * re-render (via a hard reload) whenever the editor's draft tree changes:
 *
 *   1. Legacy: `{ type: "editor:block-tree" }` (apps/web's previous main
 *      PreviewFrame; debounced ~150 ms).
 *   2. New bus (apps/web/.../canvas/PreviewMessageBus.ts):
 *      `{ source: "site-editor-parent", type: "draft", scope, blocks }`
 *      (debounced 300 ms). The rebuild's CanvasFrame posts these whenever
 *      the editor store changes.
 *
 * Why reload instead of in-place setState: BlockRenderer is a Server
 * Component (uses next/headers indirectly via lib/tenant). Pulling it
 * into a client setState path drags the entire block registry — including
 * blocks that reach into next/headers — into the client bundle, which
 * fails the Next.js build ("This API is only available in Server
 * Components"). The parent debounces draft posts so a reload-per-keystroke
 * is the worst case, not the common case.
 *
 * Used only when the preview page detects `?_editor=1` (the flag the
 * editor appends to the iframe src). Regular public traffic renders the
 * preview page directly via the server-only BlockRenderer.
 */

import { useEffect, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export function EditorPreviewShell({ children }: Props) {
  useEffect(() => {
    const handler = (e: MessageEvent): void => {
      const data = e.data as
        | { type?: string; source?: string }
        | null
        | undefined;
      if (!data) return;
      const isLegacy = data.type === "editor:block-tree";
      const isNewBusDraft =
        data.source === "site-editor-parent" && data.type === "draft";
      if (!isLegacy && !isNewBusDraft) return;
      // Trigger a server re-render with the latest tree. The parent saves
      // the draft layout before posting; the iframe pulls it on reload.
      window.location.reload();
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return <>{children}</>;
}
