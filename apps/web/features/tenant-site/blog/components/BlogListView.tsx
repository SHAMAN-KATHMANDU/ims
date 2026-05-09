"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { useTopbarActionsStore } from "@/store/topbar-actions-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, Blocks, List as ListIcon } from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  status: "draft" | "published" | "review" | "scheduled";
  author: string;
  date: string;
  reads: number;
}

export function BlogListView() {
  const router = useRouter();
  const params = useParams();
  const workspace = params.workspace as string;
  const setActions = useTopbarActionsStore((s) => s.setActions);

  const [view, setView] = useState<"table" | "grid">("table");
  const [filter, setFilter] = useState<
    "all" | "published" | "draft" | "review" | "scheduled"
  >("all");

  // TODO: Wire to useBlogPostsQuery hook when available
  const posts: BlogPost[] = [
    {
      id: "1",
      title: "Why we cook over almond wood",
      slug: "almond-wood",
      category: "Kitchen",
      status: "published",
      author: "Chef Marcus",
      date: "2 days ago",
      reads: 342,
    },
    {
      id: "2",
      title: "Seasonal sourcing strategy",
      slug: "seasonal-sourcing",
      category: "Sourcing",
      status: "published",
      author: "Sarah",
      date: "1 week ago",
      reads: 128,
    },
    {
      id: "3",
      title: "Wine pairings for summer",
      slug: "wine-summer",
      category: "Wine",
      status: "draft",
      author: "sommelier",
      date: "3 days ago",
      reads: 0,
    },
    {
      id: "4",
      title: "Bar techniques from around the world",
      slug: "bar-techniques",
      category: "Bar",
      status: "review",
      author: "Bartender Joe",
      date: "5 days ago",
      reads: 0,
    },
  ];

  useEffect(() => {
    setActions(
      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4" />
          Import
        </Button>
        <Button
          size="sm"
          onClick={() => router.push(`/${workspace}/content/post/new`)}
        >
          <Plus className="h-4 w-4" />
          Write post
        </Button>
      </div>,
    );

    return () => setActions(null);
  }, [setActions, router, workspace]);

  const filtered = posts.filter((p) => filter === "all" || p.status === filter);

  const counts = {
    all: posts.length,
    published: posts.filter((p) => p.status === "published").length,
    draft: posts.filter((p) => p.status === "draft").length,
    review: posts.filter((p) => p.status === "review").length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
  };

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

      {/* Tabs and view toggle */}
      <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] pb-3">
        <div className="flex gap-1">
          {[
            { id: "all", label: "All" },
            { id: "published", label: "Published" },
            { id: "draft", label: "Drafts" },
            { id: "review", label: "In review" },
            { id: "scheduled", label: "Scheduled" },
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
          {filtered.map((post) => (
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
                <div
                  className="h-7 w-7 flex-shrink-0 rounded"
                  style={{
                    background: `linear-gradient(135deg, oklch(0.45 0.06 50), oklch(0.28 0.05 30))`,
                  }}
                />
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
                {post.category}
              </Badge>
              <Badge
                variant={
                  post.status === "published"
                    ? "default"
                    : post.status === "draft"
                      ? "secondary"
                      : post.status === "review"
                        ? "outline"
                        : "destructive"
                }
                className="w-fit text-xs"
              >
                {post.status}
              </Badge>
              <span className="text-xs">{post.author}</span>
              <span className="mono text-xs text-[var(--ink-3)]">
                {post.date}
              </span>
              <span className="mono text-right text-xs text-[var(--ink-3)]">
                {post.reads || "—"}
              </span>
            </button>
          ))}
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
          {filtered.map((post) => (
            <button
              key={post.id}
              onClick={() =>
                router.push(`/${workspace}/content/post/${post.id}`)
              }
              className="text-left transition hover:opacity-90"
            >
              <Card className="overflow-hidden p-0">
                <div
                  className="aspect-video"
                  style={{
                    background: `linear-gradient(135deg, oklch(0.${45 + Math.random() * 10} 0.${6 + Math.random() * 10} ${30 + Math.random() * 30}), oklch(0.25 0.04 ${20 + Math.random() * 30}))`,
                  }}
                />
                <div className="p-3.5 space-y-2">
                  <div className="flex gap-1.5">
                    <Badge variant="secondary" className="text-xs">
                      {post.category}
                    </Badge>
                    <Badge
                      variant={
                        post.status === "published" ? "default" : "secondary"
                      }
                      className="text-xs"
                    >
                      {post.status}
                    </Badge>
                  </div>
                  <div className="serif text-base font-semibold leading-tight line-clamp-2">
                    {post.title}
                  </div>
                  <div className="mono text-xs text-[var(--ink-4)]">
                    {post.author} · {post.date}
                  </div>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
