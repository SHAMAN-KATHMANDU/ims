"use client";

import { useMemo } from "react";
import { Plus, ExternalLink } from "lucide-react";
import { useBlogPosts } from "@/features/tenant-blog";

interface BlogPostsListProps {
  search: string;
  workspace: string;
}

export function BlogPostsList({ search, workspace }: BlogPostsListProps) {
  const postsQuery = useBlogPosts({ limit: 100 });

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

  const newHref = `/${workspace}/settings/site/blog/new`;

  if (postsQuery.isLoading) {
    return (
      <div className="px-3 py-4 text-sm text-gray-500">Loading posts…</div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="px-3 py-4 text-center space-y-3">
        <p className="text-sm text-gray-500">
          {search ? "No posts match your search." : "No blog posts yet."}
        </p>
        <a
          href={newHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-sm font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Create first post
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-1 px-2 py-2">
      {filtered.map((post) => (
        <a
          key={post.id}
          href={`/${workspace}/settings/site/blog/${post.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-2 px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          title={`Edit ${post.title} (opens in new tab)`}
        >
          <span className="truncate">{post.title}</span>
          <ExternalLink className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        </a>
      ))}
    </div>
  );
}
