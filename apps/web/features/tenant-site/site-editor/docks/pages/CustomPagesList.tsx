"use client";

import { useMemo } from "react";
import { Plus, ExternalLink } from "lucide-react";
import { useTenantPages } from "@/features/tenant-pages";

interface CustomPagesListProps {
  search: string;
  workspace: string;
}

export function CustomPagesList({ search, workspace }: CustomPagesListProps) {
  const pagesQuery = useTenantPages({ limit: 100 });

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

  const newHref = `/${workspace}/settings/site/pages/new`;

  if (pagesQuery.isLoading) {
    return (
      <div className="px-3 py-4 text-sm text-gray-500">Loading pages…</div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="px-3 py-4 text-center space-y-3">
        <p className="text-sm text-gray-500">
          {search ? "No pages match your search." : "No custom pages yet."}
        </p>
        <a
          href={newHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-sm font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Create first page
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-1 px-2 py-2">
      {filtered.map((page) => (
        <a
          key={page.id}
          href={`/${workspace}/settings/site/pages/${page.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-2 px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          title={`Edit ${page.title} (opens in new tab)`}
        >
          <span className="truncate">{page.title}</span>
          <ExternalLink className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        </a>
      ))}
    </div>
  );
}
