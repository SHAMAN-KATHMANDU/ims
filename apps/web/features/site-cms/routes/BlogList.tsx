"use client";

import type { JSX } from "react";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSetBreadcrumbs } from "../hooks/use-breadcrumbs";
import {
  useBlogPosts,
  useCreateBlogPost,
  type BlogPostListItem,
} from "@/features/tenant-blog";
import { Btn, Card, StatusPill, Pill } from "../components/ui";
import { Upload, Plus, List, Grid3X3, ChevronRight } from "lucide-react";

interface FilteredPost extends BlogPostListItem {
  displayStatus: "published" | "draft" | "review" | "scheduled";
}

function mapPostStatus(post: BlogPostListItem): FilteredPost["displayStatus"] {
  if (post.status === "PUBLISHED") {
    return "published";
  }
  if (post.reviewStatus === "IN_REVIEW") {
    return "review";
  }
  return "draft";
}

export function BlogList(): JSX.Element {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [filterTab, setFilterTab] = useState<
    "all" | "published" | "draft" | "review" | "scheduled"
  >("all");

  const { data: postsResult, isLoading } = useBlogPosts();
  const createMutation = useCreateBlogPost();

  const posts = useMemo(() => {
    if (!postsResult?.posts) return [];
    return postsResult.posts.map((p) => ({
      ...p,
      displayStatus: mapPostStatus(p),
    })) as FilteredPost[];
  }, [postsResult]);

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      if (filterTab !== "all" && p.displayStatus !== filterTab) return false;
      return true;
    });
  }, [posts, filterTab]);

  const counts = useMemo(() => {
    return {
      all: posts.length,
      published: posts.filter((p) => p.displayStatus === "published").length,
      draft: posts.filter((p) => p.displayStatus === "draft").length,
      review: posts.filter((p) => p.displayStatus === "review").length,
      scheduled: posts.filter((p) => p.displayStatus === "scheduled").length,
    };
  }, [posts]);

  const handleNewPost = async () => {
    try {
      const newPost = await createMutation.mutateAsync({
        title: "Untitled post",
        slug: `post-${Date.now()}`,
      });
      router.push(`${newPost.id}`);
    } catch (error) {
      console.error("Failed to create post:", error);
    }
  };

  useSetBreadcrumbs(["Site", "Blog"], {
    right: (
      <div style={{ display: "flex", gap: 8 }}>
        <Btn icon={Upload}>Import</Btn>
        <Btn variant="primary" icon={Plus} onClick={handleNewPost}>
          Write post
        </Btn>
      </div>
    ),
  });

  return (
    <div style={{ padding: "20px 24px 64px", maxWidth: 1320 }}>
      {/* Filter tabs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          marginBottom: 12,
          borderBottom: "1px solid var(--line)",
        }}
        role="tablist"
      >
        {[
          { id: "all" as const, label: "All" },
          { id: "published" as const, label: "Published" },
          { id: "draft" as const, label: "Drafts" },
          { id: "review" as const, label: "In review" },
          { id: "scheduled" as const, label: "Scheduled" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setFilterTab(tab.id);
              }
            }}
            style={{
              padding: "8px 12px",
              marginBottom: -1,
              borderBottom: `2px solid ${
                filterTab === tab.id ? "var(--ink)" : "transparent"
              }`,
              color: filterTab === tab.id ? "var(--ink)" : "var(--ink-3)",
              fontSize: 12.5,
              fontWeight: filterTab === tab.id ? 600 : 450,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              transition: "color 80ms",
            }}
            role="tab"
            aria-selected={filterTab === tab.id}
          >
            {tab.label}
            <span
              style={{
                fontSize: 10.5,
                color: "var(--ink-4)",
                background: "var(--bg-sunken)",
                padding: "0 5px",
                borderRadius: 3,
                border: "1px solid var(--line)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {counts[tab.id]}
            </span>
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* View mode toggle */}
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: 2,
            background: "var(--bg-sunken)",
            border: "1px solid var(--line)",
            borderRadius: 5,
            marginBottom: 6,
          }}
        >
          <button
            onClick={() => setViewMode("table")}
            style={{
              width: 26,
              height: 22,
              borderRadius: 3,
              background:
                viewMode === "table" ? "var(--bg-elev)" : "transparent",
              boxShadow: viewMode === "table" ? "var(--shadow-sm)" : "none",
              color: viewMode === "table" ? "var(--ink)" : "var(--ink-4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
            title="Table view"
            aria-label="Table view"
          >
            <List size={12} />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            style={{
              width: 26,
              height: 22,
              borderRadius: 3,
              background:
                viewMode === "grid" ? "var(--bg-elev)" : "transparent",
              boxShadow: viewMode === "grid" ? "var(--shadow-sm)" : "none",
              color: viewMode === "grid" ? "var(--ink)" : "var(--ink-4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
            title="Grid view"
            aria-label="Grid view"
          >
            <Grid3X3 size={12} />
          </button>
        </div>
      </div>

      {/* Table view */}
      {viewMode === "table" ? (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 110px 110px 100px 100px 80px 32px",
              padding: "8px 14px",
              background: "var(--bg-sunken)",
              borderBottom: "1px solid var(--line)",
              fontSize: 10.5,
              color: "var(--ink-4)",
              letterSpacing: 0.4,
              textTransform: "uppercase",
              fontFamily: "var(--font-mono)",
            }}
          >
            <span>Title</span>
            <span>Category</span>
            <span>Status</span>
            <span>Author</span>
            <span>Date</span>
            <span style={{ textAlign: "right" }}>Reads</span>
            <span />
          </div>
          {filtered.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => router.push(`${p.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  router.push(`${p.id}`);
                }
              }}
              style={{
                display: "grid",
                gridTemplateColumns: "1.6fr 110px 110px 100px 100px 80px 32px",
                gap: 0,
                padding: "10px 14px",
                borderBottom:
                  i < filtered.length - 1 ? "1px solid var(--line-2)" : "none",
                alignItems: "center",
                textAlign: "left",
                width: "100%",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: "inherit",
                fontFamily: "inherit",
              }}
              aria-label={`Open post ${p.title}`}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 4,
                    background: "var(--accent-soft)",
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {p.title}
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: "var(--ink-4)",
                    }}
                  >
                    /blog/{p.slug}
                  </div>
                </div>
              </div>
              <div role="gridcell">
                <Pill tone="ghost">{p.category?.name || "—"}</Pill>
              </div>
              <div role="gridcell">
                <StatusPill status={p.displayStatus} />
              </div>
              <div
                role="gridcell"
                style={{ fontSize: 12, color: "var(--ink-3)" }}
              >
                {p.authorName || "—"}
              </div>
              <div
                role="gridcell"
                className="mono"
                style={{
                  fontSize: 11.5,
                  color: "var(--ink-3)",
                }}
              >
                {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}
              </div>
              <div
                role="gridcell"
                className="mono"
                style={{
                  fontSize: 11.5,
                  color: "var(--ink-3)",
                  textAlign: "right",
                }}
              >
                —
              </div>
              <div role="gridcell">
                <ChevronRight
                  size={12}
                  style={{ color: "var(--ink-4)", marginLeft: "auto" }}
                />
              </div>
            </button>
          ))}
          {!isLoading && filtered.length === 0 && (
            <div
              style={{
                padding: 60,
                textAlign: "center",
                color: "var(--ink-4)",
                fontSize: 13,
              }}
            >
              No posts match your filters.
            </div>
          )}
        </Card>
      ) : (
        /* Grid view */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14,
          }}
        >
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => router.push(`${p.id}`)}
              style={{
                textAlign: "left",
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
              }}
              aria-label={`Open post ${p.title}`}
            >
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <div
                  style={{
                    aspectRatio: "16/10",
                    background: "var(--bg-sunken)",
                  }}
                />
                <div style={{ padding: 14 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    <Pill tone="ghost">{p.category?.name || "—"}</Pill>
                    <StatusPill status={p.displayStatus} />
                  </div>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 600,
                      lineHeight: 1.25,
                      marginBottom: 4,
                    }}
                  >
                    {p.title}
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: "var(--ink-4)",
                    }}
                  >
                    {p.authorName || "—"} ·{" "}
                    {p.createdAt
                      ? new Date(p.createdAt).toLocaleDateString()
                      : "—"}
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
