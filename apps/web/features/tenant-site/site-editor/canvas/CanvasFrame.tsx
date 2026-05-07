/**
 * Canvas frame: iframe wrapper for the site preview.
 * Handles zoom, device viewport, and refresh.
 */

import React, { useRef, useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import type { SiteLayoutScope } from "@repo/shared";

interface CanvasFrameProps {
  scope: SiteLayoutScope;
  device: "desktop" | "tablet" | "mobile";
  zoom: number;
  onRefresh?: () => void;
}

const DEVICE_WIDTHS = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

export const CanvasFrame = React.forwardRef<HTMLDivElement, CanvasFrameProps>(
  ({ scope, device, zoom, onRefresh: _onRefresh }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [iframeUrl, setIframeUrl] = useState("");

    useEffect(() => {
      const url = `${process.env.NEXT_PUBLIC_TENANT_SITE_URL}/preview/site/${scope}`;
      setIframeUrl(url);
    }, [scope]);

    return (
      <div ref={ref} className="flex flex-col h-full bg-gray-100">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="capitalize">{device}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (iframeRef.current) {
                  iframeRef.current.src = `${process.env.NEXT_PUBLIC_TENANT_SITE_URL}/preview/site/${scope}`;
                }
              }}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
              title="Refresh preview"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex items-center justify-center overflow-auto p-4">
          <div
            style={{
              width: DEVICE_WIDTHS[device],
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
              transition: "transform 200ms",
            }}
          >
            <iframe
              ref={iframeRef}
              src={iframeUrl}
              className="w-full h-96 bg-white border border-gray-200 shadow-md"
              title={`Site preview - ${scope}`}
            />
          </div>
        </div>
      </div>
    );
  },
);

CanvasFrame.displayName = "CanvasFrame";
