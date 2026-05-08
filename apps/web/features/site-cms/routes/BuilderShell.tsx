"use client";

import type { JSX } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHideCmsTopbar } from "../hooks/use-breadcrumbs";
import { SiteEditorPage } from "../../tenant-site/site-editor/SiteEditorPage";
import { Btn } from "../components/ui";
import {
  ArrowLeft,
  Undo2,
  Redo2,
  History,
  Eye,
  ChevronDown,
} from "lucide-react";
import "../builder-tokens.css";

interface BuilderShellProps {
  workspace: string;
  pageId: string;
}

export function BuilderShell({
  workspace,
  pageId,
}: BuilderShellProps): JSX.Element {
  const router = useRouter();
  useHideCmsTopbar();

  useEffect(() => {
    // Ensure pageId is properly formatted
    if (!pageId) {
      router.push(`/${workspace}/site/pages`);
    }
  }, [pageId, router, workspace]);

  if (!pageId) {
    return <></>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Builder top bar */}
      <div
        style={{
          height: 48,
          borderBottom: "1px solid var(--line)",
          background: "var(--bg)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 12,
          flexShrink: 0,
        }}
      >
        {/* Back button */}
        <Btn
          variant="ghost"
          size="sm"
          icon={ArrowLeft}
          onClick={() => router.push(`/${workspace}/site/pages`)}
        >
          Pages
        </Btn>

        {/* Page title (placeholder) */}
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--ink)",
            marginLeft: 12,
          }}
        >
          Page · Saving…
        </span>

        <div style={{ flex: 1 }} />

        {/* Undo/Redo */}
        <Btn variant="ghost" size="sm" icon={Undo2} />
        <Btn variant="ghost" size="sm" icon={Redo2} />
        <Btn variant="ghost" size="sm" icon={History} />

        {/* Preview */}
        <Btn variant="ghost" size="sm" icon={Eye}>
          Preview
        </Btn>

        {/* Publish */}
        <Btn variant="primary" size="sm" iconRight={ChevronDown}>
          Publish
        </Btn>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, overflow: "hidden" }} data-cms-builder>
        <SiteEditorPage
          tenantId={workspace}
          embedded={true}
          initialScope="home"
        />
      </div>
    </div>
  );
}
