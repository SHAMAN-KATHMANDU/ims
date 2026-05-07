"use client";

/**
 * Inline blog-post editor — modal overlay equivalent of the previous
 * main's `BlogEditorWorkspace`. Hosts the existing `BlogPostEditor` so
 * users can create or edit a post without leaving the site editor canvas.
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBlogPost, BlogPostEditor } from "@/features/tenant-blog";
import type { BlogPost } from "@/features/tenant-blog";

export type BlogEditorTarget =
  | { mode: "new" }
  | { mode: "edit"; postId: string };

interface BlogPostEditorDialogProps {
  target: BlogEditorTarget | null;
  onClose: () => void;
  onCreated?: (post: BlogPost) => void;
}

export function BlogPostEditorDialog({
  target,
  onClose,
  onCreated,
}: BlogPostEditorDialogProps) {
  const postQuery = useBlogPost(target?.mode === "edit" ? target.postId : null);
  if (!target) return null;
  const post = target.mode === "edit" ? (postQuery.data ?? null) : null;
  const loading = target.mode === "edit" && postQuery.isLoading;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle>
            {target.mode === "new" ? "New blog post" : "Edit post"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {loading ? (
              <div className="text-center py-16 text-sm text-muted-foreground">
                Loading post…
              </div>
            ) : (
              <BlogPostEditor
                post={post}
                onBack={onClose}
                onCreated={(p) => {
                  onCreated?.(p);
                  onClose();
                }}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
