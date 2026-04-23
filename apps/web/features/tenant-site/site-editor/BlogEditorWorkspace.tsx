"use client";

import { ArrowLeft } from "lucide-react";
import { useBlogPost, BlogPostEditor } from "@/features/tenant-blog";
import type { BlogPost } from "@/features/tenant-blog";

type BlogEditorTarget = { mode: "new" } | { mode: "edit"; postId: string };

export function BlogEditorWorkspace({
  target,
  onClose,
  onCreated,
}: {
  target: BlogEditorTarget;
  onClose: () => void;
  onCreated: (post: BlogPost) => void;
}) {
  const postQuery = useBlogPost(target.mode === "edit" ? target.postId : null);
  const post = target.mode === "edit" ? (postQuery.data ?? null) : null;
  const loading = target.mode === "edit" && postQuery.isLoading;

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden min-h-0">
      <div className="h-11 border-b border-border bg-card flex items-center gap-2 px-3 shrink-0">
        <button
          onClick={onClose}
          className="h-7 px-2 rounded hover:bg-muted text-[12px] text-foreground/80 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft size={12} />
          Back to blog
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <div className="text-[13px] font-semibold text-foreground">
          {target.mode === "new" ? "New post" : "Edit post"}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {loading ? (
            <div className="text-center py-16 text-[13px] text-muted-foreground/60">
              Loading post…
            </div>
          ) : (
            <BlogPostEditor
              post={post}
              onBack={onClose}
              onCreated={onCreated}
            />
          )}
        </div>
      </div>
    </div>
  );
}
