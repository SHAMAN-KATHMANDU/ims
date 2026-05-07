"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { useBlogPosts } from "@/features/tenant-blog";
import {
  BlogPostEditorDialog,
  type BlogEditorTarget,
} from "./BlogPostEditorDialog";

interface BlogPostsListProps {
  search: string;
  workspace: string;
}

export function BlogPostsList({
  search,
  workspace: _workspace,
}: BlogPostsListProps) {
  const postsQuery = useBlogPosts({ limit: 100 });
  const [editTarget, setEditTarget] = useState<BlogEditorTarget | null>(null);

  const filtered = useMemo(() => {
    const posts = postsQuery.data?.posts ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.slug?.toLowerCase().includes(q) ?? false),
    );
  }, [postsQuery.data, search]);

  if (postsQuery.isLoading) {
    return (
      <div className="px-3 py-4 text-sm text-gray-500">Loading posts…</div>
    );
  }

  return (
    <>
      {filtered.length === 0 ? (
        <div className="px-3 py-4 text-center space-y-3">
          <p className="text-sm text-gray-500">
            {search ? "No posts match your search." : "No blog posts yet."}
          </p>
          <button
            type="button"
            onClick={() => setEditTarget({ mode: "new" })}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-sm font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create first post
          </button>
        </div>
      ) : (
        <div className="space-y-1 px-2 py-2">
          {filtered.map((post) => (
            <button
              key={post.id}
              type="button"
              onClick={() => setEditTarget({ mode: "edit", postId: post.id })}
              className="flex items-center justify-between gap-2 w-full px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
              title={`Edit ${post.title}`}
            >
              <span className="truncate">{post.title}</span>
              <Pencil className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            </button>
          ))}
        </div>
      )}

      <BlogPostEditorDialog
        target={editTarget}
        onClose={() => setEditTarget(null)}
      />
    </>
  );
}
