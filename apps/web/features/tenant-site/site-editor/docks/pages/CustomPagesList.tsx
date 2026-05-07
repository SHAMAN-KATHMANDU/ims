"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { useTenantPages } from "@/features/tenant-pages";
import { PageEditorDialog, type PageEditorTarget } from "./PageEditorDialog";

interface CustomPagesListProps {
  search: string;
  /** Workspace slug — kept on the API surface for parity with BlogPostsList,
   * even though the dialog flow no longer routes through `/settings/site/pages`. */
  workspace: string;
}

export function CustomPagesList({
  search,
  workspace: _workspace,
}: CustomPagesListProps) {
  const pagesQuery = useTenantPages({ limit: 100 });
  const [editTarget, setEditTarget] = useState<PageEditorTarget | null>(null);

  const filtered = useMemo(() => {
    const pages = pagesQuery.data?.pages ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.slug?.toLowerCase().includes(q) ?? false),
    );
  }, [pagesQuery.data, search]);

  if (pagesQuery.isLoading) {
    return (
      <div className="px-3 py-4 text-sm text-gray-500">Loading pages…</div>
    );
  }

  return (
    <>
      {filtered.length === 0 ? (
        <div className="px-3 py-4 text-center space-y-3">
          <p className="text-sm text-gray-500">
            {search ? "No pages match your search." : "No custom pages yet."}
          </p>
          <button
            type="button"
            onClick={() => setEditTarget({ mode: "new" })}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-sm font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create first page
          </button>
        </div>
      ) : (
        <div className="space-y-1 px-2 py-2">
          {filtered.map((page) => (
            <button
              key={page.id}
              type="button"
              onClick={() => setEditTarget({ mode: "edit", pageId: page.id })}
              className="flex items-center justify-between gap-2 w-full px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
              title={`Edit ${page.title}`}
            >
              <span className="truncate">{page.title}</span>
              <Pencil className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            </button>
          ))}
        </div>
      )}

      <PageEditorDialog
        target={editTarget}
        onClose={() => setEditTarget(null)}
      />
    </>
  );
}
