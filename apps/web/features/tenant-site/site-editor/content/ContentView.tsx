/**
 * ContentView — full-screen content management surface inside the site
 * editor. Rendered when the EditorTopBar's mode toggle is set to "content";
 * in that mode the canvas + inspector are hidden so the user gets a focused
 * surface for managing pages and blog posts without leaving the editor.
 *
 * Reuses the dock-side `CustomPagesList` / `BlogPostsList` components and
 * their inline editor dialogs (`PageEditorDialog`, `BlogPostEditorDialog`)
 * so the create/edit flow is identical to what the Pages dock already
 * exposes — this view just gives them more room.
 */

"use client";

import { useState } from "react";
import { Plus, Search, FileText, Newspaper } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  PageEditorDialog,
  type PageEditorTarget,
} from "../docks/pages/PageEditorDialog";
import {
  BlogPostEditorDialog,
  type BlogEditorTarget,
} from "../docks/pages/BlogPostEditorDialog";
import { useTenantPages } from "@/features/tenant-pages";
import { useBlogPosts } from "@/features/tenant-blog";

type ContentTab = "pages" | "blog";

const TABS: { id: ContentTab; label: string; icon: React.ReactNode }[] = [
  { id: "pages", label: "Pages", icon: <FileText className="h-4 w-4" /> },
  { id: "blog", label: "Blog", icon: <Newspaper className="h-4 w-4" /> },
];

export function ContentView() {
  const [activeTab, setActiveTab] = useState<ContentTab>("pages");
  const [search, setSearch] = useState("");
  const [pageTarget, setPageTarget] = useState<PageEditorTarget | null>(null);
  const [postTarget, setPostTarget] = useState<BlogEditorTarget | null>(null);

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
      {/* Tabs + new button */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <div className="flex">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setActiveTab(t.id);
                  setSearch("");
                }}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === t.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            onClick={() =>
              activeTab === "pages"
                ? setPageTarget({ mode: "new" })
                : setPostTarget({ mode: "new" })
            }
          >
            <Plus className="h-4 w-4 mr-1.5" />
            {activeTab === "pages" ? "New page" : "New post"}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-3">
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder={`Search ${activeTab}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label={`Search ${activeTab}`}
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6">
          {activeTab === "pages" ? (
            <PagesTable
              search={search}
              onEdit={(id) => setPageTarget({ mode: "edit", pageId: id })}
            />
          ) : (
            <BlogTable
              search={search}
              onEdit={(id) => setPostTarget({ mode: "edit", postId: id })}
            />
          )}
        </div>
      </div>

      <PageEditorDialog
        target={pageTarget}
        onClose={() => setPageTarget(null)}
      />
      <BlogPostEditorDialog
        target={postTarget}
        onClose={() => setPostTarget(null)}
      />
    </div>
  );
}

function PagesTable({
  search,
  onEdit,
}: {
  search: string;
  onEdit: (id: string) => void;
}) {
  const pagesQuery = useTenantPages({ limit: 100 });
  const all = pagesQuery.data?.pages ?? [];
  const q = search.trim().toLowerCase();
  const pages = q
    ? all.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.slug?.toLowerCase().includes(q) ?? false),
      )
    : all;

  if (pagesQuery.isLoading) {
    return <div className="text-sm text-gray-500">Loading pages…</div>;
  }
  if (pages.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-gray-500">
        {search ? "No pages match your search." : "No custom pages yet."}
      </div>
    );
  }
  return (
    <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
      {pages.map((page) => (
        <button
          key={page.id}
          type="button"
          onClick={() => onEdit(page.id)}
          className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="text-sm font-medium text-gray-900">{page.title}</div>
          <div className="text-xs text-gray-500 mt-0.5">/{page.slug}</div>
        </button>
      ))}
    </div>
  );
}

function BlogTable({
  search,
  onEdit,
}: {
  search: string;
  onEdit: (id: string) => void;
}) {
  const postsQuery = useBlogPosts({ limit: 100 });
  const all = postsQuery.data?.posts ?? [];
  const q = search.trim().toLowerCase();
  const posts = q
    ? all.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.slug?.toLowerCase().includes(q) ?? false),
      )
    : all;

  if (postsQuery.isLoading) {
    return <div className="text-sm text-gray-500">Loading posts…</div>;
  }
  if (posts.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-gray-500">
        {search ? "No posts match your search." : "No blog posts yet."}
      </div>
    );
  }
  return (
    <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
      {posts.map((post) => (
        <button
          key={post.id}
          type="button"
          onClick={() => onEdit(post.id)}
          className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="text-sm font-medium text-gray-900">{post.title}</div>
          <div className="text-xs text-gray-500 mt-0.5">/{post.slug}</div>
        </button>
      ))}
    </div>
  );
}
