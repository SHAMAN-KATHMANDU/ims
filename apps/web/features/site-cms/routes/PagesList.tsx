"use client";

import type { JSX } from "react";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSetBreadcrumbs } from "../hooks/use-breadcrumbs";
import {
  useTenantPages,
  useCreateTenantPage,
  usePublishTenantPage,
  useDeleteTenantPage,
} from "@/features/tenant-pages";
import type { TenantPageListItem } from "@/features/tenant-pages";
import { Btn, Card, StatusPill, Pill } from "../components/ui";
import {
  Plus,
  Upload,
  Search,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  LayoutList,
  Send,
  Copy,
  Folder,
  Tag,
  Trash2,
  MoreVertical,
} from "lucide-react";

interface FilteredPage extends TenantPageListItem {
  status: "published" | "draft" | "review" | "scheduled";
}

function mapPageStatus(page: TenantPageListItem): FilteredPage["status"] {
  if (page.isPublished) {
    return "published";
  }
  if (page.reviewStatus === "IN_REVIEW") {
    return "review";
  }
  return "draft";
}

export function PagesList(): JSX.Element {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterTab, setFilterTab] = useState<
    "all" | "published" | "draft" | "review" | "scheduled"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: pagesResult, isLoading } = useTenantPages();
  const publishMutation = usePublishTenantPage();
  const deleteMutation = useDeleteTenantPage();
  const createMutation = useCreateTenantPage();

  const pages = useMemo(() => {
    if (!pagesResult?.pages) return [];
    return pagesResult.pages.map((p) => ({
      ...p,
      status: mapPageStatus(p),
    })) as FilteredPage[];
  }, [pagesResult]);

  const filtered = useMemo(() => {
    return pages.filter((p) => {
      if (filterTab !== "all" && p.status !== filterTab) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!p.title.toLowerCase().includes(q) && !p.slug.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [pages, filterTab, searchQuery]);

  const counts = useMemo(() => {
    return {
      all: pages.length,
      published: pages.filter((p) => p.status === "published").length,
      draft: pages.filter((p) => p.status === "draft").length,
      review: pages.filter((p) => p.status === "review").length,
      scheduled: pages.filter((p) => p.status === "scheduled").length,
    };
  }, [pages]);

  const toggleSelect = (id: string) => {
    setSelectedIds((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const allSelected =
    filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  };

  const handleNewPage = async () => {
    try {
      const newPage = await createMutation.mutateAsync({
        title: "Untitled page",
        slug: `page-${Date.now()}`,
      });
      router.push(`${newPage.id}`);
    } catch (error) {
      console.error("Failed to create page:", error);
    }
  };

  const handlePublishSelected = async () => {
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => publishMutation.mutateAsync(id)),
      );
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Failed to publish pages:", error);
    }
  };

  const handleDeleteSelected = async () => {
    if (
      !window.confirm(
        `Delete ${selectedIds.size} page(s)? This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => deleteMutation.mutateAsync(id)),
      );
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Failed to delete pages:", error);
    }
  };

  useSetBreadcrumbs(["Site", "Pages"], {
    right: (
      <div style={{ display: "flex", gap: 8 }}>
        <Btn icon={Upload}>Import</Btn>
        <Btn variant="primary" icon={Plus} onClick={handleNewPage}>
          New page
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
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            height: 30,
            padding: "0 10px",
            borderRadius: 6,
            border: "1px solid var(--line)",
            background: "var(--bg-elev)",
            flex: "0 1 320px",
            minWidth: 200,
          }}
        >
          <Search size={13} style={{ color: "var(--ink-4)" }} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter pages…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 12.5,
              color: "var(--ink)",
            }}
          />
        </div>
        <Btn icon={Filter}>Filters</Btn>
        <Btn icon={ArrowUpDown}>Sort: Last edited</Btn>
        <div style={{ flex: 1 }} />
        <Btn
          icon={LayoutGrid}
          disabled
          style={{ opacity: 0.5, cursor: "default" }}
        >
          Tree view
        </Btn>
        <Btn icon={LayoutList} active>
          List view
        </Btn>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 14px",
            marginBottom: 8,
            background: "var(--accent-soft)",
            border: "1px solid var(--accent-line)",
            borderRadius: 6,
          }}
        >
          <span
            style={{
              fontSize: 11.5,
              color: "var(--accent)",
              fontWeight: 600,
              fontFamily: "var(--font-mono)",
            }}
          >
            {selectedIds.size} selected
          </span>
          <span
            style={{
              width: 1,
              height: 14,
              background: "var(--accent-line)",
            }}
          />
          <Btn size="sm" icon={Send} onClick={handlePublishSelected}>
            Publish
          </Btn>
          <Btn size="sm" icon={Send}>
            Submit for review
          </Btn>
          <Btn size="sm" icon={Copy}>
            Duplicate
          </Btn>
          <Btn size="sm" icon={Folder}>
            Move
          </Btn>
          <Btn size="sm" icon={Tag}>
            Add tag
          </Btn>
          <div style={{ flex: 1 }} />
          <Btn
            size="sm"
            variant="danger"
            icon={Trash2}
            onClick={handleDeleteSelected}
          >
            Delete
          </Btn>
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{
              fontSize: 11,
              color: "var(--accent)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
            }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <Card style={{ overflow: "hidden", padding: 0 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "32px 1.6fr 1.2fr 110px 90px 110px 100px 32px",
            padding: "8px 14px",
            background: "var(--bg-sunken)",
            borderBottom: "1px solid var(--line)",
            fontSize: 10.5,
            color: "var(--ink-4)",
            letterSpacing: 0.4,
            textTransform: "uppercase",
            fontFamily: "var(--font-mono)",
            alignItems: "center",
          }}
        >
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            style={{ accentColor: "var(--accent)", cursor: "pointer" }}
          />
          <span>Title</span>
          <span>Path</span>
          <span>Status</span>
          <span style={{ textAlign: "right" }}>Views</span>
          <span>Updated</span>
          <span>Author</span>
          <span />
        </div>
        {filtered.map((p, i) => {
          const checked = selectedIds.has(p.id);
          const handleRowClick = () => {
            router.push(`pages/${p.id}`);
          };
          return (
            <div
              key={p.id}
              role="row"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "32px 1.6fr 1.2fr 110px 90px 110px 100px 32px",
                padding: "10px 14px",
                borderBottom:
                  i < filtered.length - 1 ? "1px solid var(--line-2)" : "none",
                alignItems: "center",
                background: checked
                  ? "oklch(from var(--accent) l c h / 0.05)"
                  : "transparent",
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(p.id);
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter" || e.key === " ") {
                    toggleSelect(p.id);
                  }
                }}
                aria-label={`Select page ${p.title}`}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  style={{
                    accentColor: "var(--accent)",
                    cursor: "pointer",
                  }}
                />
              </button>
              <button
                type="button"
                onClick={handleRowClick}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRowClick();
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 0,
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "inherit",
                }}
                aria-label={`Open page ${p.title}`}
              >
                <span
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {p.title}
                </span>
                {p.slug === "home" && <Pill tone="ghost">Homepage</Pill>}
              </button>
              <div
                role="gridcell"
                style={{
                  fontSize: 12,
                  color: "var(--ink-3)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {p.slug}
              </div>
              <div role="gridcell">
                <StatusPill status={p.status} />
              </div>
              <div
                role="gridcell"
                style={{
                  fontSize: 12,
                  color: "var(--ink-3)",
                  textAlign: "right",
                  fontFamily: "var(--font-mono)",
                }}
              >
                —
              </div>
              <div
                role="gridcell"
                style={{
                  fontSize: 12,
                  color: "var(--ink-3)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {new Date(p.updatedAt).toLocaleDateString()}
              </div>
              <div
                role="gridcell"
                style={{ fontSize: 12, color: "var(--ink-3)" }}
              >
                —
              </div>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                aria-label="Page menu"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  color: "var(--ink-4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <MoreVertical size={14} />
              </button>
            </div>
          );
        })}
        {!isLoading && filtered.length === 0 && (
          <div
            style={{
              padding: 60,
              textAlign: "center",
              color: "var(--ink-4)",
              fontSize: 13,
            }}
          >
            No pages match your filters.
          </div>
        )}
      </Card>

      <div
        style={{
          marginTop: 10,
          fontSize: 11,
          color: "var(--ink-4)",
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--font-mono)",
        }}
      >
        <span>
          {filtered.length} of {pages.length} pages
        </span>
        <span>↑↓ to navigate · ⏎ to open · ⌘D duplicate · ⌫ delete</span>
      </div>
    </div>
  );
}
