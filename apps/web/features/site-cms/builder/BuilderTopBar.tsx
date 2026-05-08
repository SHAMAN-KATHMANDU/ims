"use client";

import type { JSX } from "react";
import { useRouter } from "next/navigation";
import { Btn } from "../components/ui";
import {
  ArrowLeft,
  Undo2,
  Redo2,
  History,
  Eye,
  ChevronDown,
  Monitor,
  Tablet,
  Smartphone,
} from "lucide-react";

interface BuilderTopBarProps {
  workspace: string;
  pageTitle: string;
  savedAt: string;
  device: "desktop" | "tablet" | "mobile";
  onDeviceChange: (device: "desktop" | "tablet" | "mobile") => void;
  onUndo: () => void;
  onRedo: () => void;
  onHistory: () => void;
  onPublish: () => void;
  isDirty: boolean;
}

export function BuilderTopBar({
  workspace,
  pageTitle,
  savedAt,
  device,
  onDeviceChange,
  onUndo,
  onRedo,
  onHistory,
  onPublish,
  isDirty,
}: BuilderTopBarProps): JSX.Element {
  const router = useRouter();

  return (
    <div
      style={{
        height: 48,
        borderBottom: "1px solid var(--line)",
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        gap: 10,
        flexShrink: 0,
      }}
    >
      <Btn
        variant="ghost"
        size="sm"
        icon={ArrowLeft}
        onClick={() => router.push(`/${workspace}/site/pages`)}
        style={{ color: "var(--ink-2)" }}
      >
        Pages
      </Btn>

      <div
        style={{
          height: 24,
          width: 1,
          background: "var(--line)",
        }}
      />

      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.2 }}>
          {pageTitle || "Untitled page"}
        </div>
        <div className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>
          / · saved {savedAt}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Device toggle */}
      <div
        style={{
          display: "flex",
          padding: 2,
          gap: 0,
          background: "var(--bg-sunken)",
          border: "1px solid var(--line)",
          borderRadius: 6,
        }}
      >
        {[
          { key: "desktop", icon: Monitor },
          { key: "tablet", icon: Tablet },
          { key: "mobile", icon: Smartphone },
        ].map(({ key, icon: Icon }) => (
          <button
            key={key}
            onClick={() =>
              onDeviceChange(key as "desktop" | "tablet" | "mobile")
            }
            title={`${key.charAt(0).toUpperCase() + key.slice(1)} view`}
            style={{
              width: 28,
              height: 24,
              borderRadius: 4,
              background: device === key ? "var(--bg-elev)" : "transparent",
              boxShadow: device === key ? "var(--shadow-sm)" : "none",
              color: device === key ? "var(--ink)" : "var(--ink-4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Icon size={13} />
          </button>
        ))}
      </div>

      <div
        style={{
          height: 24,
          width: 1,
          background: "var(--line)",
        }}
      />

      <Btn
        variant="ghost"
        size="sm"
        icon={Undo2}
        title="Undo"
        onClick={onUndo}
        style={{ color: "var(--ink-3)" }}
      />
      <Btn
        variant="ghost"
        size="sm"
        icon={Redo2}
        title="Redo"
        onClick={onRedo}
        style={{ color: "var(--ink-3)" }}
      />
      <Btn
        variant="ghost"
        size="sm"
        icon={History}
        title="History"
        onClick={onHistory}
        style={{ color: "var(--ink-3)" }}
      />

      <div
        style={{
          height: 24,
          width: 1,
          background: "var(--line)",
        }}
      />

      <Btn variant="ghost" size="sm" icon={Eye}>
        Preview
      </Btn>

      <Btn
        variant="primary"
        size="sm"
        iconRight={ChevronDown}
        onClick={onPublish}
      >
        {isDirty ? "Save" : "Publish"}
      </Btn>
    </div>
  );
}
