/**
 * Canvas frame: iframe wrapper for the site preview.
 *
 * The preview URL is minted by the API via `usePreviewUrl(scope, pageId)` —
 * it embeds an HMAC token the tenant-site `/preview/site/[scope]` route
 * verifies before rendering the draft layout. Without that token, the
 * route falls through to its 404 page, which is what the user was hitting
 * before this change.
 *
 * Iframe fills the canvas area; device widths match the previous main
 * (desktop 1280, tablet 820, mobile 390) so PDP/breakpoint testing stays
 * consistent.
 */

import React, { useRef, useEffect, useState } from "react";
import { RotateCcw, AlertCircle } from "lucide-react";
import type { SiteLayoutScope } from "@repo/shared";
import { usePreviewUrl } from "../hooks/usePreviewUrl";
import { useEditorStore } from "../store/editor-store";
import { selectBlocks } from "../store/selectors";
import { sendToPreview } from "./PreviewMessageBus";

interface CanvasFrameProps {
  scope: SiteLayoutScope;
  device: "desktop" | "tablet" | "mobile";
  zoom: number;
  /** Optional page id (used for product-detail preview to hydrate the right product). */
  pageId?: string;
  /** Bumped after publish to force a hard reload. */
  refreshKey?: number;
  onRefresh?: () => void;
}

const DEVICE_WIDTHS: Record<CanvasFrameProps["device"], string> = {
  desktop: "1280px",
  tablet: "820px",
  mobile: "390px",
};

const DRAFT_SYNC_DEBOUNCE_MS = 300;

export const CanvasFrame = React.forwardRef<HTMLDivElement, CanvasFrameProps>(
  ({ scope, device, zoom, pageId, refreshKey = 0, onRefresh }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const previewQuery = usePreviewUrl(scope, pageId);
    const url = previewQuery.data ?? "";

    const [loading, setLoading] = useState(true);
    const [errored, setErrored] = useState(false);

    useEffect(() => {
      setLoading(true);
      setErrored(false);
    }, [url, refreshKey]);

    // Force a hard reload when a template is picked — usePickSiteTemplate
    // emits this event after the server overwrites every layout, so the
    // iframe needs to drop its cached HTML and refetch the new draft.
    useEffect(() => {
      const handler = (): void => {
        previewQuery.refetch();
        if (iframeRef.current && url) {
          iframeRef.current.src = url;
        }
        onRefresh?.();
      };
      window.addEventListener("site-template-picked", handler);
      return () => {
        window.removeEventListener("site-template-picked", handler);
      };
    }, [url, previewQuery, onRefresh]);

    // Live block sync: post the current draft tree to the iframe whenever
    // the editor store changes (debounced 300 ms). The iframe-side listener
    // applies the new tree without a full reload, so edits surface ~instantly
    // in the preview.
    const blocks = useEditorStore(selectBlocks);
    useEffect(() => {
      if (!iframeRef.current?.contentWindow || loading) return;
      const handle = window.setTimeout(() => {
        const win = iframeRef.current?.contentWindow;
        if (!win) return;
        sendToPreview(win, { type: "draft", scope, blocks });
      }, DRAFT_SYNC_DEBOUNCE_MS);
      return () => window.clearTimeout(handle);
    }, [blocks, scope, loading]);

    const handleLoad = (): void => {
      setLoading(false);
    };

    const handleError = (): void => {
      setLoading(false);
      setErrored(true);
    };

    const handleRefresh = (): void => {
      if (iframeRef.current && url) {
        iframeRef.current.src = url;
      }
      previewQuery.refetch();
      onRefresh?.();
    };

    const tokenError = previewQuery.isError;

    return (
      <div ref={ref} className="flex flex-col h-full bg-gray-100">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="capitalize">{device}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
              title="Refresh preview"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Canvas — outer scrolls; inner is sized to the device frame and
            the iframe gets a tall fixed height so its OWN content scrolls
            (avoids the previous bug where h-full clipped the preview to
            the viewport and hid the scrollbar). */}
        <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
          <div
            className="relative"
            style={{
              width: DEVICE_WIDTHS[device],
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
              transition: "transform 200ms",
            }}
          >
            {url && (
              <iframe
                key={`${url}-${refreshKey}`}
                ref={iframeRef}
                src={url}
                onLoad={handleLoad}
                onError={handleError}
                className="w-full bg-white border border-gray-200 shadow-md"
                style={{ height: "calc(100vh - 9rem)", minHeight: 720 }}
                title={`Site preview - ${scope}`}
              />
            )}

            {(loading || previewQuery.isLoading) && !errored && !tokenError && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/60">
                <div className="text-sm text-gray-500">Loading preview…</div>
              </div>
            )}

            {(errored || tokenError) && (
              <div className="absolute inset-0 flex items-center justify-center bg-white">
                <div className="text-center max-w-xs space-y-3 p-4">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                  <div className="text-sm font-medium text-gray-900">
                    Preview unavailable
                  </div>
                  <div className="text-xs text-gray-500">
                    {tokenError
                      ? "Couldn't mint a preview token. Check your network and try again."
                      : "The tenant-site preview didn't respond. Try refreshing."}
                  </div>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="px-3 py-1.5 text-xs font-medium rounded border border-gray-300 hover:bg-gray-50"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);

CanvasFrame.displayName = "CanvasFrame";
