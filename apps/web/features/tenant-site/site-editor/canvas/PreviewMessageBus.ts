/**
 * Typed message protocol for parent ↔ iframe communication in the site editor.
 * Single point for all cross-origin messaging.
 */

export type DropZone = "top" | "bottom" | "left" | "right" | "inside";

export interface BlockRect {
  id: string;
  rect: DOMRect;
}

export type PreviewMessage =
  | { type: "select"; id: string | null }
  | { type: "hover"; id: string | null }
  | { type: "scroll-to"; id: string }
  | {
      type: "rects";
      entries: Array<{
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
      }>;
    }
  | {
      type: "pointer";
      x: number;
      y: number;
      target: string;
    }
  | {
      type: "dragover";
      x: number;
      y: number;
      target: string;
      zone?: DropZone;
    }
  | {
      type: "drop";
      target: string;
      zone: DropZone;
    }
  | {
      type: "slash-open";
      rect: { x: number; y: number; width: number; height: number };
      anchorId: string;
    }
  | {
      type: "slash-close";
    }
  // Live block sync: parent emits the current draft tree after every
  // store mutation so the iframe can re-render without a full reload.
  // Iframe-side listener lives in `apps/tenant-site/.../preview/site/[scope]`.
  | {
      type: "draft";
      scope: string;
      blocks: unknown;
    };

/**
 * Post a message from parent to iframe preview.
 */
export function sendToPreview(window: Window, message: PreviewMessage) {
  window.postMessage(
    { source: "site-editor-parent", ...message },
    process.env.NEXT_PUBLIC_TENANT_SITE_URL || "*",
  );
}

/**
 * Post a message from iframe preview to parent editor.
 */
export function sendToParent(window: Window, message: PreviewMessage) {
  window.parent.postMessage(
    { source: "site-editor-preview", ...message },
    process.env.NEXT_PUBLIC_EDITOR_URL || "*",
  );
}

/**
 * Listen for messages in the parent (editor).
 */
export function listenForPreviewMessages(
  callback: (message: PreviewMessage) => void,
) {
  const handler = (e: MessageEvent) => {
    if (e.data?.source !== "site-editor-preview") return;
    const message: PreviewMessage = e.data;
    callback(message);
  };

  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}

/**
 * Listen for messages in the iframe (preview).
 */
export function listenForParentMessages(
  callback: (message: PreviewMessage) => void,
) {
  const handler = (e: MessageEvent) => {
    if (e.data?.source !== "site-editor-parent") return;
    const message: PreviewMessage = e.data;
    callback(message);
  };

  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}
