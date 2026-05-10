"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { useTopbarActionsStore } from "@/store/topbar-actions-store";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronLeft, Sparkles, Eye, ChevronDown, Upload } from "lucide-react";
import {
  useBlogPostQuery,
  useUpdateBlogPost,
  usePublishBlogPost,
  useBlogCategoriesQuery,
  type BlogPost,
} from "../../hooks/use-blog";

interface TopbarStore {
  setActions: (actions: React.ReactNode) => void;
}

const selectSetActions = (s: TopbarStore) => s.setActions;

export function PostEditorView({ postId }: { postId: string }) {
  const router = useRouter();
  const params = useParams();
  const workspace = params.workspace as string;
  const setActions = useTopbarActionsStore(selectSetActions);

  const isNew = postId === "new";

  const { data: existingPost, isLoading } = useBlogPostQuery(
    isNew ? "" : postId,
  );
  const { data: categories = [] } = useBlogCategoriesQuery();
  const updatePost = useUpdateBlogPost();
  const publishPost = usePublishBlogPost();

  const [post, setPost] = useState<Partial<BlogPost>>({
    title: "Untitled post",
    slug: "untitled",
    bodyMarkdown: "",
    tags: [],
  });
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [showSeo, setShowSeo] = useState<boolean>(false);
  const [showSchedule, setShowSchedule] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load existing post
  useEffect(() => {
    if (existingPost && !isNew) {
      setPost(existingPost);
      setShowSchedule(!!existingPost.scheduledPublishAt);
    }
  }, [existingPost, isNew]);

  const debouncedBodyMarkdown = useDebounce(post.bodyMarkdown ?? "", 2000);

  // Autosave on debounced body change
  useEffect(() => {
    if (isNew || !post.id) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (debouncedBodyMarkdown !== existingPost?.bodyMarkdown) {
        updatePost.mutate(
          { id: post.id!, payload: { bodyMarkdown: debouncedBodyMarkdown } },
          {
            onSuccess: () => {
              setLastSaveTime(new Date());
            },
          },
        );
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    debouncedBodyMarkdown,
    isNew,
    post.id,
    existingPost?.bodyMarkdown,
    updatePost,
  ]);

  const getSaveStatus = () => {
    if (updatePost.isPending) return "Saving…";
    if (!lastSaveTime) return "";
    const secondsAgo = Math.floor((Date.now() - lastSaveTime.getTime()) / 1000);
    if (secondsAgo < 60) return `Saved ${secondsAgo}s ago`;
    const minutesAgo = Math.floor(secondsAgo / 60);
    return `Saved ${minutesAgo}m ago`;
  };

  useEffect(() => {
    const publishLabel = post.isPublished ? "Update" : "Publish";
    setActions(
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled
                data-testid="ai-polish-stub"
              >
                <Sparkles className="h-4 w-4" />
                Polish with AI
              </Button>
            </TooltipTrigger>
            <TooltipContent>Coming soon</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const previewUrl = `/${workspace}/blog/${post.slug}?draft=true&postId=${post.id}`;
            window.open(previewUrl, "_blank");
          }}
        >
          <Eye className="h-4 w-4" />
          Preview
        </Button>
        <Button
          size="sm"
          onClick={() => {
            if (post.id) {
              publishPost.mutate(post.id, {
                onSuccess: (updated) => {
                  setPost(updated);
                  setLastSaveTime(new Date());
                },
              });
            }
          }}
          disabled={publishPost.isPending || !post.id}
        >
          {publishPost.isPending ? "Publishing…" : publishLabel}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>,
    );

    return () => setActions(null);
  }, [
    setActions,
    post.isPublished,
    post.id,
    post.slug,
    workspace,
    publishPost,
  ]);

  const updateField = <K extends keyof Partial<BlogPost>>(
    key: K,
    value: Partial<BlogPost>[K],
  ) => {
    setPost((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading && !isNew) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--bg-sunken)]">
        <div className="space-y-3">
          <div className="h-8 w-64 bg-[var(--bg-elev)] rounded animate-pulse" />
          <div className="h-48 w-96 bg-[var(--bg-elev)] rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[var(--bg-sunken)]">
      {/* Topbar */}
      <div className="border-b border-[var(--line)] bg-[var(--bg)] px-3 py-3 flex items-center gap-2.5">
        <button
          onClick={() => router.push(`/${workspace}/site/blog`)}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded text-sm font-medium hover:bg-[var(--bg-elev)]"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Journal
        </button>
        <div className="h-6 w-px" style={{ background: "var(--line)" }} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold leading-tight truncate">
            {post.title || "Untitled post"}
          </div>
          <div
            className="mono text-xs truncate"
            style={{ color: "var(--ink-4)" }}
          >
            /blog/{post.slug || "untitled"} · {getSaveStatus()}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div className="flex-1 overflow-auto p-8 flex justify-center">
          <div className="w-full max-w-2xl">
            {/* Meta line */}
            <div
              className="mono mb-2 text-xs uppercase tracking-wide"
              style={{ color: "var(--ink-4)" }}
            >
              {categories.find((c) => c.id === post.categoryId)?.name || "—"} ·{" "}
              {post.createdAt
                ? new Date(post.createdAt).toLocaleDateString()
                : new Date().toLocaleDateString()}
            </div>

            {/* Title */}
            <input
              value={post.title || ""}
              onChange={(e) => {
                updateField("title", e.target.value);
                if (post.id) {
                  updatePost.mutate({
                    id: post.id,
                    payload: { title: e.target.value },
                  });
                }
              }}
              className="serif m-0 w-full text-5xl font-semibold bg-transparent outline-none border-0 leading-tight mb-4 placeholder:text-[var(--ink-3)]"
              placeholder="Why we cook over almond wood"
              style={{ letterSpacing: "-0.8px" }}
            />

            {/* Subtitle / Excerpt */}
            <textarea
              value={post.excerpt || ""}
              onChange={(e) => {
                updateField("excerpt", e.target.value);
                if (post.id) {
                  updatePost.mutate({
                    id: post.id,
                    payload: { excerpt: e.target.value },
                  });
                }
              }}
              className="serif w-full text-lg italic bg-transparent outline-none border-0 leading-relaxed text-[var(--ink-3)] mb-6 placeholder:text-[var(--ink-4)] resize-none"
              placeholder="It started, like a lot of things in this kitchen, with a question…"
              rows={2}
            />

            {/* Cover image */}
            {post.coverImageUrl ? (
              <Image
                src={post.coverImageUrl}
                alt={post.title || "Cover image"}
                width={1280}
                height={720}
                className="w-full aspect-video object-cover rounded-lg mb-6"
                unoptimized
              />
            ) : (
              <div className="aspect-video bg-gradient-to-br from-[oklch(0.45_0.06_50)] to-[oklch(0.28_0.05_30)] rounded-lg mb-6" />
            )}

            {/* Body */}
            <textarea
              value={post.bodyMarkdown || ""}
              onChange={(e) => updateField("bodyMarkdown", e.target.value)}
              className="serif w-full text-lg bg-transparent outline-none border-0 leading-loose text-[var(--ink-2)] placeholder:text-[var(--ink-4)] resize-none"
              placeholder="Start typing or paste your content here…"
              rows={10}
              style={{ fontFamily: "var(--font-serif)" }}
            />
          </div>
        </div>

        {/* Right sidebar */}
        <aside className="w-80 border-l border-[var(--line)] bg-[var(--bg)] p-3.5 overflow-auto space-y-3.5">
          {/* Cover preview */}
          <div>
            <Label className="text-xs font-semibold block mb-2">
              Cover image
            </Label>
            {post.coverImageUrl ? (
              <Image
                src={post.coverImageUrl}
                alt={post.title || "Cover image"}
                width={320}
                height={180}
                className="aspect-video w-full object-cover rounded border border-[var(--line)] mb-2"
                unoptimized
              />
            ) : (
              <div className="aspect-video bg-gradient-to-br from-[oklch(0.45_0.06_50)] to-[oklch(0.28_0.05_30)] rounded border border-[var(--line)] mb-2" />
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled
              title="Media library coming soon"
            >
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          </div>

          {/* Meta */}
          <div>
            <div className="text-xs font-semibold mb-2.5">Meta</div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="slug" className="text-xs">
                  Slug
                </Label>
                <Input
                  id="slug"
                  value={post.slug || ""}
                  onChange={(e) => {
                    updateField("slug", e.target.value);
                    if (post.id) {
                      updatePost.mutate({
                        id: post.id,
                        payload: { slug: e.target.value },
                      });
                    }
                  }}
                  className="font-mono text-xs mt-1"
                />
              </div>
              <div>
                <Label htmlFor="category" className="text-xs">
                  Category
                </Label>
                <Select
                  value={post.categoryId || "__none__"}
                  onValueChange={(raw) => {
                    const v = raw === "__none__" ? null : raw;
                    updateField("categoryId", v);
                    if (post.id) {
                      updatePost.mutate({
                        id: post.id,
                        payload: { categoryId: v },
                      });
                    }
                  }}
                >
                  <SelectTrigger id="category" className="mt-1 text-xs">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No category</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs block mb-1.5">Tags</Label>
                <div className="flex flex-wrap gap-1.5">
                  {(post.tags || []).map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-xs cursor-pointer hover:opacity-75"
                      onClick={() => {
                        const newTags =
                          post.tags?.filter((t) => t !== tag) || [];
                        updateField("tags", newTags);
                        if (post.id) {
                          updatePost.mutate({
                            id: post.id,
                            payload: { tags: newTags },
                          });
                        }
                      }}
                    >
                      #{tag} ×
                    </Badge>
                  ))}
                  <button className="mono text-xs text-[var(--ink-4)] hover:text-[var(--ink)]">
                    + add
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div>
            <button
              onClick={() => setShowSchedule(!showSchedule)}
              className="text-xs font-semibold w-full text-left mb-2.5 hover:text-[var(--accent)]"
            >
              Schedule {showSchedule ? "▾" : "▸"}
            </button>
            {showSchedule && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="schedule-date" className="text-xs">
                    Date
                  </Label>
                  <Input
                    id="schedule-date"
                    type="datetime-local"
                    value={
                      post.scheduledPublishAt
                        ? new Date(post.scheduledPublishAt)
                            .toISOString()
                            .slice(0, 16)
                        : ""
                    }
                    onChange={(e) => {
                      const dateValue = e.target.value
                        ? new Date(e.target.value).toISOString()
                        : null;
                      updateField(
                        "scheduledPublishAt",
                        dateValue as string | null,
                      );
                      if (post.id) {
                        updatePost.mutate({
                          id: post.id,
                          payload: { scheduledPublishAt: dateValue },
                        });
                      }
                    }}
                    className="text-xs mt-1"
                  />
                </div>
              </div>
            )}
          </div>

          {/* SEO */}
          <div>
            <button
              onClick={() => setShowSeo(!showSeo)}
              className="text-xs font-semibold w-full text-left mb-2.5 hover:text-[var(--accent)]"
            >
              SEO {showSeo ? "▾" : "▸"}
            </button>
            {showSeo && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="seo-title" className="text-xs block mb-1.5">
                    SEO Title
                  </Label>
                  <Input
                    id="seo-title"
                    value={post.seoTitle || ""}
                    onChange={(e) => {
                      updateField("seoTitle", e.target.value);
                      if (post.id) {
                        updatePost.mutate({
                          id: post.id,
                          payload: { seoTitle: e.target.value },
                        });
                      }
                    }}
                    className="text-xs"
                    placeholder="SEO title for search engines"
                  />
                </div>
                <div>
                  <Label htmlFor="seo-desc" className="text-xs block mb-1.5">
                    Meta description
                  </Label>
                  <textarea
                    id="seo-desc"
                    value={post.seoDescription || ""}
                    onChange={(e) => {
                      updateField("seoDescription", e.target.value);
                      if (post.id) {
                        updatePost.mutate({
                          id: post.id,
                          payload: { seoDescription: e.target.value },
                        });
                      }
                    }}
                    className="w-full text-xs p-2 rounded border border-[var(--line)] bg-[var(--bg-sunken)] outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
                    rows={2}
                    placeholder="Describe this post for search engines…"
                  />
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete post?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone.
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction className="bg-red-600">Delete</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
