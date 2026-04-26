"use client";

/**
 * EditorPreviewShell — client-side shell for the site-editor preview iframe.
 *
 * The parent PreviewFrame posts `{ type: 'editor:block-tree' }` messages
 * (debounced ~150 ms) whenever the editor store's block tree changes. We
 * respond by reloading the iframe so the server re-renders the new tree.
 *
 * Why a reload instead of in-place setState: BlockRenderer is a Server
 * Component (uses `next/headers` indirectly via lib/tenant). Pulling it
 * into a client setState path drags the entire block registry — including
 * blocks that reach into next/headers — into the client bundle, which fails
 * the Next.js build ("This API is only available in Server Components").
 *
 * Used only when the preview page detects `?_editor=1` (the flag that
 * PreviewFrame appends to the iframe src). For regular public traffic the
 * preview page renders via the server-only BlockRenderer directly.
 *
 * The server parent renders the tree once and passes it as children; the
 * shell adds the message listener around it.
 */

import { useEffect, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export function EditorPreviewShell({ children }: Props) {
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "editor:block-tree") {
        // Trigger a server re-render with the latest tree. The parent editor
        // saves the draft layout before posting; the iframe pulls it on reload.
        window.location.reload();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return <>{children}</>;
}
