"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { useTopbarActionsStore } from "@/store/topbar-actions-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Plus,
  Upload,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Search,
} from "lucide-react";

interface Page {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "review" | "scheduled";
  views: number;
  updated: string;
  author: string;
}

export function PagesListView() {
  const router = useRouter();
  const params = useParams();
  const workspace = params.workspace as string;
  const setActions = useTopbarActionsStore((s) => s.setActions);

  const [filter, setFilter] = useState<
    "all" | "published" | "draft" | "review" | "scheduled"
  >("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set<string>());

  // TODO: Wire to usePagesQuery hook when available
  const pages: Page[] = [
    {
      id: "1",
      title: "Home",
      slug: "/",
      status: "published",
      views: 1250,
      updated: "1 day ago",
      author: "Sarah",
    },
    {
      id: "2",
      title: "About Us",
      slug: "/about",
      status: "published",
      views: 340,
      updated: "2 days ago",
      author: "Mike",
    },
    {
      id: "3",
      title: "Contact",
      slug: "/contact",
      status: "draft",
      views: 0,
      updated: "3 hours ago",
      author: "Alex",
    },
    {
      id: "4",
      title: "Services",
      slug: "/services",
      status: "review",
      views: 0,
      updated: "2 days ago",
      author: "Sarah",
    },
    {
      id: "5",
      title: "Pricing",
      slug: "/pricing",
      status: "scheduled",
      views: 0,
      updated: "1 week ago",
      author: "Mike",
    },
  ];

  useEffect(() => {
    setActions(
      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4" />
          Import
        </Button>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          New page
        </Button>
      </div>,
    );

    return () => setActions(null);
  }, [setActions]);

  const filtered = pages.filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const counts = {
    all: pages.length,
    published: pages.filter((p) => p.status === "published").length,
    draft: pages.filter((p) => p.status === "draft").length,
    review: pages.filter((p) => p.status === "review").length,
    scheduled: pages.filter((p) => p.status === "scheduled").length,
  };

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
          <Button size="sm" variant="default">
            Publish
          </Button>
          <Button size="sm" variant="outline">
            Submit
          </Button>
          <Button size="sm" variant="outline">
            Duplicate
          </Button>
          <div className="flex-1" />
          <Button size="sm" variant="destructive">
            Delete
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
                onClick={() =>
                  router.push(`/${workspace}/content/builder/${page.id}`)
                }
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
                  {page.title}
                </TableCell>
                <TableCell className="mono py-3 text-xs text-[var(--ink-3)]">
                  {page.slug}
                </TableCell>
                <TableCell className="py-3">
                  <Badge
                    variant={
                      page.status === "published"
                        ? "default"
                        : page.status === "draft"
                          ? "secondary"
                          : page.status === "review"
                            ? "outline"
                            : "destructive"
                    }
                    className="text-xs"
                  >
                    {page.status}
                  </Badge>
                </TableCell>
                <TableCell className="mono py-3 text-right text-xs text-[var(--ink-3)]">
                  {page.views > 0 ? page.views.toLocaleString() : "—"}
                </TableCell>
                <TableCell className="mono py-3 text-xs text-[var(--ink-3)]">
                  {page.updated}
                </TableCell>
                <TableCell className="py-3 text-xs">{page.author}</TableCell>
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
                      <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                        Delete
                      </DropdownMenuItem>
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
    </div>
  );
}
