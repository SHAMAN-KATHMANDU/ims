"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useParams } from "next/navigation";
import { useTopbarActionsStore } from "@/store/topbar-actions-store";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Upload,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Search,
} from "lucide-react";
import {
  usePagesQuery,
  useCreatePage,
  useDeletePage,
  usePublishPage,
  useDuplicatePage,
  type TenantPage,
} from "../../hooks/use-pages";
import { CreatePageDialog } from "./CreatePageDialog";
import { formatDistanceToNow } from "date-fns";

interface TopbarStore {
  setActions: (actions: React.ReactNode) => void;
}

const selectSetActions = (s: TopbarStore) => s.setActions;

export function PagesListView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const workspace = params.workspace as string | undefined;
  const wsString = workspace ?? "";
  const setActions = useTopbarActionsStore(selectSetActions);
  const { toast: _toast } = useToast();

  const [filter, setFilter] = useState<
    "all" | "published" | "draft" | "review" | "scheduled"
  >("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set<string>());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // The Dashboard's "+ New page" CTA links here with `?new=1`. Auto-open the
  // create dialog so the user lands directly in the create flow.
  useEffect(() => {
    if (searchParams?.get("new") === "1") {
      setShowCreateDialog(true);
    }
  }, [searchParams]);

  const debouncedSearch = useDebounce(search, 300);

  // Map filter to API status parameter
  const statusMap: Record<string, boolean | undefined> = {
    all: undefined,
    published: true,
    draft: false,
    review: false, // Note: API may not support "review" status
    scheduled: false,
  };

  const { data, isLoading } = usePagesQuery({
    page: 1,
    limit: 100,
    published: statusMap[filter],
  });

  // Built-in scope pages (header, footer, home, product-detail, blog-index,
  // …) are layout templates, not routable user pages. They live in the same
  // TenantPage table for storage convenience but belong in Templates / Design,
  // not the Pages list. Hide them here so the list is just user-authored pages.
  const pages = useMemo(
    () => (data?.pages ?? []).filter((p) => p.kind !== "scope"),
    [data?.pages],
  );
  const _createPage = useCreatePage();
  const deletePage = useDeletePage();
  const publishPage = usePublishPage();
  const duplicatePage = useDuplicatePage();

  useEffect(() => {
    setActions(
      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4" />
          Import
        </Button>
        <Button size="sm" onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4" />
          New page
        </Button>
      </div>,
    );

    return () => setActions(null);
  }, [setActions]);

  const filtered = useMemo(() => {
    return pages.filter((p) => {
      if (
        debouncedSearch &&
        !p.title.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
        return false;
      return true;
    });
  }, [pages, debouncedSearch]);

  const counts = useMemo(
    () => ({
      all: pages.length,
      published: pages.filter((p) => p.isPublished).length,
      draft: pages.filter((p) => !p.isPublished && !p.scheduledPublishAt)
        .length,
      review: 0, // API doesn't have explicit review status
      scheduled: pages.filter((p) => p.scheduledPublishAt).length,
    }),
    [pages],
  );

  const allSelected =
    filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  const toggleRow = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((p) => p.id)));
    }
  };

  const handlePublishSelected = async () => {
    try {
      await Promise.all(
        Array.from(selected).map((id) => publishPage.mutateAsync(id)),
      );
      setSelected(new Set());
    } catch (error) {
      console.error("Error publishing pages:", error);
    }
  };

  const handleDuplicateSelected = async () => {
    try {
      if (selected.size === 1) {
        const id = Array.from(selected)[0];
        if (id) {
          await duplicatePage.mutateAsync(id);
        }
      } else {
        await Promise.all(
          Array.from(selected).map((id) => duplicatePage.mutateAsync(id)),
        );
      }
      setSelected(new Set());
    } catch (error) {
      console.error("Error duplicating pages:", error);
    }
  };

  const handleDeleteSelected = async () => {
    try {
      await Promise.all(
        Array.from(selected).map((id) => deletePage.mutateAsync(id)),
      );
      setSelected(new Set());
      setDeleteTarget(null);
    } catch (error) {
      console.error("Error deleting pages:", error);
    }
  };

  const getStatusBadgeVariant = (page: TenantPage) => {
    if (page.isPublished) return "default";
    if (page.scheduledPublishAt) return "destructive";
    return "secondary";
  };

  const getStatusLabel = (page: TenantPage) => {
    if (page.isPublished) return "Published";
    if (page.scheduledPublishAt) return "Scheduled";
    return "Draft";
  };

  const getScopeLabel = (page: TenantPage) => {
    if (page.kind === "scope") {
      const scopePath = page.scope === "404" ? "/404" : `/${page.scope}`;
      return scopePath;
    }
    return `/${page.slug}`;
  };

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
            Pages
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}>
            All routable pages on <span className="mono">lumenandcoal.com</span>
            .
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--line)] flex gap-1">
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

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 flex-1 max-w-sm h-8 px-2.5 rounded border border-[var(--line)] bg-[var(--bg-elev)]">
          <Search className="h-3.5 w-3.5" style={{ color: "var(--ink-4)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter pages…"
            className="flex-1 bg-transparent border-0 text-xs outline-none placeholder:text-[var(--ink-4)]"
          />
          <span className="kbd text-xs">/</span>
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
        <Button variant="outline" size="sm">
          <ArrowUpDown className="h-4 w-4" />
          Sort
        </Button>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div
          className="flex items-center gap-3 rounded px-3.5 py-2.5 border"
          style={{
            background: "oklch(from var(--accent) l c h / 0.08)",
            borderColor: "oklch(from var(--accent) l c h / 0.25)",
          }}
        >
          <span
            className="mono text-xs font-semibold"
            style={{ color: "var(--accent)" }}
          >
            {selected.size} selected
          </span>
          <div className="h-3 w-px" style={{ background: "var(--accent)" }} />
          <Button
            size="sm"
            variant="default"
            onClick={handlePublishSelected}
            disabled={publishPage.isPending}
          >
            {publishPage.isPending ? "Publishing…" : "Publish"}
          </Button>
          <Button size="sm" variant="outline" disabled>
            Submit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDuplicateSelected}
            disabled={duplicatePage.isPending}
          >
            {duplicatePage.isPending ? "Duplicating…" : "Duplicate"}
          </Button>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setDeleteTarget("confirm")}
            disabled={deletePage.isPending}
          >
            {deletePage.isPending ? "Deleting…" : "Delete"}
          </Button>
          <button
            onClick={() => setSelected(new Set())}
            className="mono text-xs transition"
            style={{ color: "var(--accent)" }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-[var(--bg-sunken)] border-b border-[var(--line)] hover:bg-[var(--bg-sunken)]">
              <TableHead className="w-8 px-3.5 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 cursor-pointer rounded"
                  style={{ accentColor: "var(--accent)" }}
                />
              </TableHead>
              <TableHead
                className="text-xs uppercase tracking-wider mono"
                style={{ color: "var(--ink-4)" }}
              >
                Title
              </TableHead>
              <TableHead
                className="text-xs uppercase tracking-wider mono"
                style={{ color: "var(--ink-4)" }}
              >
                Path
              </TableHead>
              <TableHead
                className="text-xs uppercase tracking-wider mono"
                style={{ color: "var(--ink-4)" }}
              >
                Status
              </TableHead>
              <TableHead
                className="text-right text-xs uppercase tracking-wider mono"
                style={{ color: "var(--ink-4)" }}
              >
                Views
              </TableHead>
              <TableHead
                className="text-xs uppercase tracking-wider mono"
                style={{ color: "var(--ink-4)" }}
              >
                Updated
              </TableHead>
              <TableHead
                className="text-xs uppercase tracking-wider mono"
                style={{ color: "var(--ink-4)" }}
              >
                Author
              </TableHead>
              <TableHead className="w-8 px-3.5 py-2" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((page) => (
              <TableRow
                key={page.id}
                className="border-b border-[var(--line-2)] last:border-0 hover:bg-[var(--bg-sunken)] transition cursor-pointer"
                style={{
                  background: selected.has(page.id)
                    ? "oklch(from var(--accent) l c h / 0.05)"
                    : undefined,
                }}
                onClick={() => {
                  const url =
                    page.kind === "scope"
                      ? `/${wsString}/site/builder/${page.id}?scope=${page.scope}`
                      : `/${wsString}/site/builder/${page.id}`;
                  router.push(url);
                }}
              >
                <TableCell className="px-3.5 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(page.id)}
                    onChange={() => toggleRow(page.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 cursor-pointer rounded"
                    style={{ accentColor: "var(--accent)" }}
                  />
                </TableCell>
                <TableCell className="py-3 text-sm font-medium">
                  <div className="flex items-center gap-2">
                    {page.kind === "scope" && (
                      <Badge variant="outline" className="text-xs">
                        Scope
                      </Badge>
                    )}
                    {page.title}
                  </div>
                </TableCell>
                <TableCell className="mono py-3 text-xs text-[var(--ink-3)]">
                  {getScopeLabel(page)}
                </TableCell>
                <TableCell className="py-3">
                  <Badge
                    variant={getStatusBadgeVariant(page)}
                    className="text-xs"
                  >
                    {getStatusLabel(page)}
                  </Badge>
                </TableCell>
                <TableCell className="mono py-3 text-right text-xs text-[var(--ink-3)]">
                  {(() => {
                    const views = (page as { views?: unknown }).views;
                    return typeof views === "number" && views > 0
                      ? views.toLocaleString()
                      : "—";
                  })()}
                </TableCell>
                <TableCell className="mono py-3 text-xs text-[var(--ink-3)]">
                  {formatDistanceToNow(new Date(page.updatedAt), {
                    addSuffix: true,
                  })}
                </TableCell>
                <TableCell className="py-3 text-xs">
                  {/* User name can be extracted from auth context if needed */}
                  —
                </TableCell>
                <TableCell className="px-3.5 py-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded hover:bg-[var(--bg-elev)]"
                      >
                        <MoreVertical
                          className="h-4 w-4"
                          style={{ color: "var(--ink-4)" }}
                        />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          const url =
                            page.kind === "scope"
                              ? `/${wsString}/site/builder/${page.id}?scope=${page.scope}`
                              : `/${wsString}/site/builder/${page.id}`;
                          window.open(url, "_blank");
                        }}
                      >
                        Edit
                      </DropdownMenuItem>
                      {page.kind !== "scope" && (
                        <>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicatePage.mutate(page.id);
                            }}
                          >
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(page.id);
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <div
            className="py-12 text-center text-sm"
            style={{ color: "var(--ink-4)" }}
          >
            No pages match your filters.
          </div>
        )}
      </Card>

      {/* Footer */}
      <div
        className="mono flex justify-between text-xs"
        style={{ color: "var(--ink-4)" }}
      >
        <span>
          {filtered.length} of {pages.length} pages
        </span>
        <span>↑↓ to navigate · ⏎ to open · ⌘D duplicate · ⌫ delete</span>
      </div>

      {/* Create Page Dialog */}
      <CreatePageDialog
        open={showCreateDialog}
        onOpenChange={(next) => {
          setShowCreateDialog(next);
          // Drop the `?new=1` flag once the dialog closes so navigating back
          // to /site/pages doesn't keep popping the dialog open.
          if (!next && searchParams?.get("new") === "1") {
            router.replace(`/${wsString}/site/pages`);
          }
        }}
        onCreated={(newPageId) => {
          setShowCreateDialog(false);
          router.push(`/${wsString}/site/builder/${newPageId}`);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget}>
        <AlertDialogContent>
          <AlertDialogTitle>
            Delete page{selected.size > 1 ? "s" : ""}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {selected.size > 1
              ? `You're about to delete ${selected.size} pages. This action cannot be undone.`
              : "This action cannot be undone."}
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              className="bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
