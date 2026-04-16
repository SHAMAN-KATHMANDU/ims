"use client";

/**
 * PreviewFrame — center pane of the editor.
 *
 * Iframes the tenant-site at /preview/site/<scope>?token=... and exposes a
 * responsive width toggle (desktop / tablet / mobile). The `refreshKey`
 * prop is bumped by the parent after a save so the iframe reloads with
 * the new draft.
 */

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Monitor,
  Smartphone,
  Tablet,
  RefreshCw,
  ExternalLink,
  Grid3X3,
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
};

export function PreviewFrame({
  previewUrl,
  loading,
  refreshKey,
  onRefresh,
  device,
  onDeviceChange,
}: Props) {
  const [showGrid, setShowGrid] = useState(false);

  const src = useMemo(() => {
    if (!previewUrl) return null;
    const u = new URL(previewUrl);
    u.searchParams.set("_r", String(refreshKey));
    if (showGrid) u.searchParams.set("grid", "1");
    return u.toString();
  }, [previewUrl, refreshKey, showGrid]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1">
          <DeviceButton
            active={device === "desktop"}
            onClick={() => onDeviceChange("desktop")}
            label="Desktop"
          >
            <Monitor className="h-4 w-4" />
          </DeviceButton>
          <DeviceButton
            active={device === "tablet"}
            onClick={() => onDeviceChange("tablet")}
            label="Tablet"
          >
            <Tablet className="h-4 w-4" />
          </DeviceButton>
          <DeviceButton
            active={device === "mobile"}
            onClick={() => onDeviceChange("mobile")}
            label="Mobile"
          >
            <Smartphone className="h-4 w-4" />
          </DeviceButton>
          <DeviceButton
            active={showGrid}
            onClick={() => setShowGrid((v) => !v)}
            label="Toggle grid overlay"
          >
            <Grid3X3 className="h-4 w-4" />
          </DeviceButton>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            disabled={!previewUrl}
          >
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            Refresh
          </Button>
          {src && (
            <Button size="sm" variant="ghost" asChild>
              <a href={src} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1 h-3.5 w-3.5" />
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
