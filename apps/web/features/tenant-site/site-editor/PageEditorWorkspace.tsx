"use client";

import { ArrowLeft } from "lucide-react";
import { useTenantPage, TenantPageEditor } from "@/features/tenant-pages";
import type { TenantPage as TenantPageModel } from "@/features/tenant-pages";

type PageEditorTarget = { mode: "new" } | { mode: "edit"; pageId: string };

export function PageEditorWorkspace({
  target,
  onClose,
  onCreated,
}: {
  target: PageEditorTarget;
  onClose: () => void;
  onCreated: (page: TenantPageModel) => void;
}) {
  const pageQuery = useTenantPage(
    target.mode === "edit" ? target.pageId : null,
  );
  const page = target.mode === "edit" ? (pageQuery.data ?? null) : null;
  const loading = target.mode === "edit" && pageQuery.isLoading;

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden min-h-0">
      <div className="h-11 border-b border-border bg-card flex items-center gap-2 px-3 shrink-0">
        <button
          onClick={onClose}
          className="h-7 px-2 rounded hover:bg-muted text-[12px] text-foreground/80 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft size={12} />
          Back to pages
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <div className="text-[13px] font-semibold text-foreground">
          {target.mode === "new" ? "New custom page" : "Edit page details"}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {loading ? (
            <div className="text-center py-16 text-[13px] text-muted-foreground/60">
              Loading page…
            </div>
          ) : (
            <TenantPageEditor
              page={page}
              onBack={onClose}
              onCreated={onCreated}
              disablePreview
            />
          )}
        </div>
      </div>
    </div>
  );
}
