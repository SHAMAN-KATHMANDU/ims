"use client";

import { useState } from "react";
import { Plus, Search, FileText, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import {
  useBlogPosts,
  useDeleteBlogPost,
  BlogStatusBadge,
} from "@/features/tenant-blog";
import type { BlogPostListItem, BlogPostStatus } from "@/features/tenant-blog";

export function BlogPanel({
  onNew,
  onEdit,
}: {
  onNew: () => void;
  onEdit: (postId: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<BlogPostStatus | "ALL">(
    "ALL",
  );
  const [search, setSearch] = useState("");
  const postsQuery = useBlogPosts({
    limit: 50,
    ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
  });
  const deletePost = useDeleteBlogPost();
  const { toast } = useToast();
  const posts = postsQuery.data?.posts ?? [];

  const handleDelete = (post: BlogPostListItem) => {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    deletePost.mutate(post.id, {
      onSuccess: () => toast({ title: "Post deleted" }),
      onError: () => toast({ title: "Delete failed", variant: "destructive" }),
    });
  };

  const filters: { value: BlogPostStatus | "ALL"; label: string }[] = [
    { value: "ALL", label: "All" },
    { value: "DRAFT", label: "Drafts" },
    { value: "PUBLISHED", label: "Live" },
    { value: "ARCHIVED", label: "Archived" },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="h-11 px-3 flex items-center border-b border-border shrink-0">
        <span className="text-[13px] font-semibold text-foreground flex-1">
          Blog
        </span>
        <button
          onClick={onNew}
          className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-muted"
          title="New post"
        >
          <Plus size={14} />
        </button>
      </div>
      <div className="px-3 pt-2.5 pb-2 flex flex-col gap-2 shrink-0">
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/60"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts…"
            className="w-full h-7 pl-7 pr-2.5 rounded-md border border-border bg-muted/50 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "h-6 px-2 rounded-full text-[11px] font-medium transition-colors",
                statusFilter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-1">
        {postsQuery.isLoading && (
          <div className="text-center py-8 text-[12px] text-muted-foreground/60">
            Loading…
          </div>
        )}
        {posts.map((post) => (
          <button
            type="button"
            key={post.id}
            className="w-full text-left group flex items-start gap-2 px-2 py-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => onEdit(post.id)}
          >
            <FileText
              size={13}
              className="shrink-0 text-muted-foreground/60 mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-medium text-foreground truncate leading-tight">
                {post.title || "Untitled"}
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <BlogStatusBadge status={post.status} />
                {post.category && (
                  <span className="text-[10px] text-muted-foreground/70 truncate">
                    · {post.category.name}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(post);
              }}
              className="h-6 w-6 grid place-items-center rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
              title="Delete"
            >
              <Trash2 size={11} />
            </button>
          </button>
        ))}
        {!postsQuery.isLoading && posts.length === 0 && (
          <div className="text-center py-8 px-3 text-[12px] text-muted-foreground/80">
            <div className="relative mx-auto mb-3 h-12 w-12">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/10 to-transparent blur-md" />
              <div className="relative h-12 w-12 rounded-xl bg-muted border border-border grid place-items-center">
                <FileText size={20} className="text-muted-foreground/60" />
              </div>
            </div>
            <div className="text-[12.5px] font-medium text-foreground/80 mb-0.5">
              {search || statusFilter !== "ALL"
                ? "No posts match"
                : "No blog posts yet"}
            </div>
            <div className="text-[11px] text-muted-foreground/60">
              {search || statusFilter !== "ALL"
                ? "Try clearing filters or a different search."
                : "Write your first post to get started."}
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-border px-3 py-2 shrink-0">
        <button
          onClick={onNew}
          className="flex items-center justify-center gap-1.5 h-7 px-3 rounded-md border border-dashed border-border text-[12px] text-muted-foreground hover:bg-muted/50 transition-colors w-full"
        >
          <Plus size={12} /> New post
        </button>
      </div>
    </div>
  );
}
