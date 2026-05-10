"use client";

import {
  ChevronLeft,
  Redo2,
  Undo2,
  History,
  Zap,
  Eye,
  Share2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { SiteLayoutScope } from "@repo/shared";
import { useEditorStore } from "./store/editor-store";
import { usePreviewUrl } from "./hooks/usePreviewUrl";

interface EditorTopBarProps {
  workspace: string;
  pageId: string;
  scope: SiteLayoutScope;
}

export function EditorTopBar({ workspace, pageId, scope }: EditorTopBarProps) {
  const router = useRouter();
  const { undo, redo } = useEditorStore();

  // Mint a token-gated preview URL bound to this scope + page so the Preview
  // button can open the live tenant-site renderer in a new tab. The hook
  // refreshes the URL on a 25-min cadence (server tokens TTL at 30 min).
  const { data: previewUrl } = usePreviewUrl(scope, pageId);
  const handlePreview = () => {
    if (previewUrl) window.open(previewUrl, "_blank", "noopener,noreferrer");
  };

  const handleBack = () => {
    router.push(`/${workspace}/site/pages`);
  };

  return (
    <div
      className="h-12 border-b flex items-center px-3 gap-3 bg-[var(--bg)] flex-shrink-0"
      style={{ borderBottomColor: "var(--line)" }}
    >
      {/* Back button + page info */}
      <button
        onClick={handleBack}
        className="h-7 px-2 rounded flex items-center gap-1.5 text-[var(--ink-3)] text-xs hover:bg-[var(--bg-sunken)]"
      >
        <ChevronLeft size={14} />
        Pages
      </button>

      <div
        className="h-5"
        style={{ backgroundColor: "var(--line)", width: "1px" }}
      />

      <div>
        <div className="text-sm font-medium text-[var(--ink)]">{pageId}</div>
        <div className="text-xs text-[var(--ink-4)] font-mono">
          {scope} · saved just now · v1
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Device toggle */}
      <div
        className="flex p-0.5 gap-0 rounded-md"
        style={{
          backgroundColor: "var(--bg-sunken)",
          border: "1px solid var(--line)",
        }}
      >
        {["desktop", "tablet", "mobile"].map((device) => (
          <button
            key={device}
            className="w-7 h-6 rounded flex items-center justify-center text-xs"
            title={device}
            style={{
              backgroundColor: "transparent",
              color: "var(--ink-4)",
            }}
          >
            {device.charAt(0).toUpperCase()}
          </button>
        ))}
      </div>

      <div
        className="h-5"
        style={{ backgroundColor: "var(--line)", width: "1px" }}
      />

      {/* Undo/Redo/History */}
      <button
        onClick={undo}
        className="w-7 h-7 rounded flex items-center justify-center text-[var(--ink-3)] hover:bg-[var(--bg-sunken)]"
        title="Undo"
      >
        <Undo2 size={14} />
      </button>
      <button
        onClick={redo}
        className="w-7 h-7 rounded flex items-center justify-center text-[var(--ink-3)] hover:bg-[var(--bg-sunken)]"
        title="Redo"
      >
        <Redo2 size={14} />
      </button>
      <button
        className="w-7 h-7 rounded flex items-center justify-center text-[var(--ink-3)] hover:bg-[var(--bg-sunken)]"
        title="History"
      >
        <History size={14} />
      </button>

      <div
        className="h-5"
        style={{ backgroundColor: "var(--line)", width: "1px" }}
      />

      {/* AI / Preview / Publish */}
      <button
        className="px-2.5 h-7 rounded text-xs font-medium flex items-center gap-1.5 text-[var(--ink-3)]"
        style={{
          border: "1px solid transparent",
        }}
      >
        <Zap size={12} />
        Ask AI
      </button>

      <button
        onClick={handlePreview}
        disabled={!previewUrl}
        title={
          previewUrl
            ? "Open this scope's preview in a new tab"
            : "Preview unavailable — TENANT_SITE_PUBLIC_URL not configured and no verified custom domain"
        }
        className="px-2.5 h-7 rounded text-xs font-medium flex items-center gap-1.5 text-[var(--ink-3)] hover:bg-[var(--bg-sunken)] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          border: "1px solid transparent",
        }}
      >
        <Eye size={12} />
        Preview
      </button>

      <button
        className="px-2.5 h-7 rounded text-xs font-medium flex items-center gap-1.5"
        style={{
          backgroundColor: "var(--accent)",
          color: "white",
          border: "1px solid transparent",
        }}
      >
        <Share2 size={12} />
        Publish
      </button>
    </div>
  );
}
