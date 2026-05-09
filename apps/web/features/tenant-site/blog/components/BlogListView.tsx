"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { useTopbarActionsStore } from "@/store/topbar-actions-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Upload, Blocks, List as ListIcon } from "lucide-react";
import {
  useBlogPostsQuery,
  useBlogCategoriesQuery,
} from "../../hooks/use-blog";
import { CreateBlogPostDialog } from "./CreateBlogPostDialog";
import { formatDistanceToNow } from "date-fns";

interface TopbarStore {
  setActions: (actions: React.ReactNode) => void;
}

const selectSetActions = (s: TopbarStore) => s.setActions;

export function BlogListView() {
  const router = useRouter();
  const params = useParams();
  const workspace = params.workspace as string;
  const setActions = useTopbarActionsStore(selectSetActions);

  const [view, setView] = useState<"table" | "grid">("table");
  const [filter, setFilter] = useState<
    "all" | "PUBLISHED" | "DRAFT" | "ARCHIVED"
  >("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const statusMap: Record<
    string,
    "DRAFT" | "PUBLISHED" | "ARCHIVED" | undefined
  > = {
    all: undefined,
    PUBLISHED: "PUBLISHED",
    DRAFT: "DRAFT",
    ARCHIVED: "ARCHIVED",
  };

  const { data, isLoading } = useBlogPostsQuery({
    page: 1,
    limit: 100,
    status: statusMap[filter],
    categoryId: selectedCategory || undefined,
  });

  const { data: categories = [] } = useBlogCategoriesQuery();

  const posts = useMemo(() => data?.posts ?? [], [data?.posts]);

  useEffect(() => {
    setActions(
      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4" />
          Import
        </Button>
        <Button size="sm" onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4" />
          Write post
        </Button>
      </div>,
    );

    return () => setActions(null);
  }, [setActions]);

  const filtered = useMemo(
    () =>
      posts.filter((p) => {
        if (selectedCategory && p.categoryId !== selectedCategory) return false;
        return true;
      }),
    [posts, selectedCategory],
  );

  const counts = useMemo(
    () => ({
      all: posts.length,
      PUBLISHED: posts.filter((p) => p.isPublished).length,
      DRAFT: posts.filter((p) => !p.isPublished && !p.scheduledPublishAt)
        .length,
      ARCHIVED: 0,
    }),
    [posts],
  );

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 w-32 bg-[var(--bg-sunken)] rounded animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-12 bg-[var(--bg-sunken)] rounded animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1
            className="serif m-0 text-2xl font-semibold"
            style={{ letterSpacing: "-0.3px" }}
          >
            Journal
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}>
            Long-form posts at{" "}
            <span className="mono">lumenandcoal.com/blog</span>.
          </p>
        </div>
      </div>

      {/* Tabs, filters and view toggle */}
      <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] pb-3">
        <div className="flex gap-4">
          <div className="flex gap-1">
            {[
              { id: "all", label: "All" },
              { id: "PUBLISHED", label: "Published" },
              { id: "DRAFT", label: "Drafts" },
              { id: "ARCHIVED", label: "Archived" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as typeof filter)}
                className="inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm transition"
                style={{
                  borderColor: filter === tab.id ? "var(--ink)" : "transparent",
                  color: filter === tab.id ? "var(--ink)" : "var(--ink-3)",
                  fontWeight: filter === tab.id ? 600 : 450,
                }}
              >
                {tab.label}
                <span
                  className="mono text-xs rounded border border-[var(--line)] bg-[var(--bg-sunken)] px-1.5 py-0.5"
                  style={{ color: "var(--ink-4)" }}
                >
                  {counts[tab.id as keyof typeof counts]}
                </span>
              </button>
            ))}
          </div>

          {/* Category filter */}
          <Select
            value={selectedCategory || "__all__"}
            onValueChange={(v) => setSelectedCategory(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-1 rounded border border-[var(--line)] bg-[var(--bg-sunken)] p-0.5">
          {[
            { id: "table", icon: ListIcon },
            { id: "grid", icon: Blocks },
          ].map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setView(id as typeof view)}
              className="p-1.5 rounded transition"
              style={{
                background: view === id ? "var(--bg-elev)" : "transparent",
                boxShadow: view === id ? "var(--shadow-sm)" : "none",
              }}
            >
              <Icon
                className="h-3 w-3"
                style={{ color: view === id ? "var(--ink)" : "var(--ink-4)" }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* View content */}
      {view === "table" ? (
        <Card className="overflow-hidden p-0">
          <div
            className="grid gap-0 border-b border-[var(--line)] px-3.5 py-2 text-xs uppercase tracking-wider mono"
            style={{
              gridTemplateColumns: "1.6fr 110px 110px 100px 100px 80px",
              background: "var(--bg-sunken)",
              color: "var(--ink-4)",
            }}
          >
            <span>Title</span>
            <span>Category</span>
            <span>Status</span>
            <span>Author</span>
            <span>Date</span>
            <span className="text-right">Reads</span>
          </div>
          {filtered.map((post) => {
            const categoryName =
              categories.find((c) => c.id === post.categoryId)?.name || "—";
            return (
              <button
                key={post.id}
                onClick={() =>
                  router.push(`/${workspace}/content/post/${post.id}`)
                }
                className="w-full grid gap-3 px-3.5 py-3 text-left border-b border-[var(--line-2)] last:border-0 hover:bg-[var(--bg-sunken)] transition"
                style={{
                  gridTemplateColumns: "1.6fr 110px 110px 100px 100px 80px",
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {post.coverImageUrl ? (
                    <Image
                      src={post.coverImageUrl}
                      alt={post.title}
                      width={28}
                      height={28}
                      className="h-7 w-7 flex-shrink-0 rounded object-cover"
                      unoptimized
                    />
                  ) : (
                    <div
                      className="h-7 w-7 flex-shrink-0 rounded flex items-center justify-center text-xs font-semibold"
                      style={{
                        background: `oklch(0.45 0.06 ${Math.random() * 360})`,
                        color: "white",
                      }}
                    >
                      {post.title.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {post.title}
                    </div>
                    <div className="mono text-xs text-[var(--ink-4)]">
                      /blog/{post.slug}
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className="w-fit text-xs">
                  {categoryName}
                </Badge>
                <Badge
                  variant={post.isPublished ? "default" : "secondary"}
                  className="w-fit text-xs"
                >
                  {post.isPublished ? "Published" : "Draft"}
                </Badge>
                <span className="text-xs">{post.authorName || "—"}</span>
                <span className="mono text-xs text-[var(--ink-3)]">
                  {formatDistanceToNow(new Date(post.createdAt), {
                    addSuffix: true,
                  })}
                </span>
                <span className="mono text-right text-xs text-[var(--ink-3)]">
                  {(() => {
                    const views = (post as { views?: unknown }).views;
                    return typeof views === "number" && views > 0 ? views : "—";
                  })()}
                </span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div
              className="py-12 text-center text-sm"
              style={{ color: "var(--ink-4)" }}
            >
              No posts match your filters.
            </div>
          )}
        </Card>
      ) : (
        <div className="grid gap-3.5 grid-cols-3">
          {filtered.map((post) => {
            const categoryName =
              categories.find((c) => c.id === post.categoryId)?.name ||
              "Uncategorized";
            return (
              <button
                key={post.id}
                onClick={() =>
                  router.push(`/${workspace}/content/post/${post.id}`)
                }
                className="text-left transition hover:opacity-90"
              >
                <Card className="overflow-hidden p-0">
                  {post.coverImageUrl ? (
                    <Image
                      src={post.coverImageUrl}
                      alt={post.title}
                      width={640}
                      height={360}
                      className="aspect-video w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div
                      className="aspect-video flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, oklch(0.45 0.06 ${Math.random() * 360}), oklch(0.28 0.05 ${Math.random() * 360}))`,
                      }}
                    />
                  )}
                  <div className="p-3.5 space-y-2">
                    <div className="flex gap-1.5">
                      <Badge variant="secondary" className="text-xs">
                        {categoryName}
                      </Badge>
                      <Badge
                        variant={post.isPublished ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {post.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    <div className="serif text-base font-semibold leading-tight line-clamp-2">
                      {post.title}
                    </div>
                    <div className="mono text-xs text-[var(--ink-4)]">
                      {post.authorName || "—"} ·{" "}
                      {formatDistanceToNow(new Date(post.createdAt), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      )}

      {/* Create Blog Post Dialog */}
      <CreateBlogPostDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={(newPostId) => {
          setShowCreateDialog(false);
          router.push(`/${workspace}/content/post/${newPostId}`);
        }}
      />
    </div>
  );
}
