"use client";

/**
 * Template picker with search, category filter, and pagination.
 *
 * When the catalog grows past 9 entries the tenant would otherwise have to
 * scroll a long tile grid; search + category chips narrow it quickly and
 * pagination keeps the card height predictable. The list is reactive —
 * changing the filter resets to page 1 — and an empty-result state gives
 * actionable feedback instead of a blank wall.
 */

import { useMemo, useState } from "react";
import { CheckCircle2, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import {
  useSiteTemplates,
  usePickSiteTemplate,
  type SiteTemplate,
} from "../hooks/use-tenant-site";

interface SiteTemplatePickerProps {
  activeTemplateId: string | null;
  disabled?: boolean;
}

const PAGE_SIZE = 9;

function templatePrimary(template: SiteTemplate): string {
  const branding = template.defaultBranding as {
    colors?: { primary?: string };
  } | null;
  return branding?.colors?.primary ?? "#ddd";
}

export function SiteTemplatePicker({
  activeTemplateId,
  disabled,
}: SiteTemplatePickerProps) {
  const { toast } = useToast();
  const templatesQuery = useSiteTemplates();
  const pickMutation = usePickSiteTemplate();
  const [confirm, setConfirm] = useState<SiteTemplate | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Reset pagination whenever the filter narrows the result set.
  const onQueryChange = (v: string) => {
    setQuery(v);
    setPage(1);
  };
  const onCategoryChange = (v: string | null) => {
    setCategory(v);
    setPage(1);
  };

  // useMemo on the raw array so downstream useMemos have a stable reference
  // when templatesQuery.data is undefined (would otherwise be a fresh `[]`
  // on every render and invalidate the memos below).
  const templates = useMemo(
    () => templatesQuery.data ?? [],
    [templatesQuery.data],
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const t of templates) {
      if (t.category) set.add(t.category);
    }
    return Array.from(set).sort();
  }, [templates]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      if (t.slug === "blank") return false; // shown separately
      if (category && t.category !== category) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [templates, query, category]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const handlePick = async (resetBranding: boolean) => {
    if (!confirm) return;
    try {
      await pickMutation.mutateAsync({
        templateSlug: confirm.slug,
        resetBranding,
      });
      toast({
        title: "Template applied",
        description: confirm.name,
      });
      setConfirm(null);
    } catch (error) {
      toast({
        title: "Failed to apply template",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const showControls = templates.length > 6;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Template</CardTitle>
          <CardDescription>
            Pick the look for your storefront. Switching templates keeps your
            branding unless you choose to reset.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {templatesQuery.isLoading && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Loading templates…
            </p>
          )}

          {!templatesQuery.isLoading && templates.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No templates available.
            </p>
          )}

          {!templatesQuery.isLoading && templates.length > 0 && (
            <>
              {showControls && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search
                      className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      value={query}
                      onChange={(e) => onQueryChange(e.target.value)}
                      placeholder="Search templates…"
                      className="pl-8"
                      disabled={disabled}
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => onQueryChange("")}
                        className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label="Clear search"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  {categories.length > 1 && (
                    <div className="flex flex-wrap gap-1.5">
                      <CategoryChip
                        active={category === null}
                        onClick={() => onCategoryChange(null)}
                        label="All"
                      />
                      {categories.map((c) => (
                        <CategoryChip
                          key={c}
                          active={category === c}
                          onClick={() => onCategoryChange(c)}
                          label={c}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {filtered.length === 0 ? (
                <div className="rounded-md border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                  No templates match your filters.
                  <div className="mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onQueryChange("");
                        onCategoryChange(null);
                      }}
                    >
                      Clear filters
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Build Your Own card — appears before template options */}
                  {templates.some((t) => t.slug === "blank") && (
                    <button
                      type="button"
                      aria-label="Build your own template from a blank canvas"
                      onClick={() => {
                        const blankTpl = templates.find(
                          (t) => t.slug === "blank",
                        );
                        if (blankTpl) setConfirm(blankTpl);
                      }}
                      className={cn(
                        "rounded-lg border-2 border-dashed p-6 text-center transition-colors hover:border-primary hover:bg-primary/5",
                        activeTemplateId &&
                          templates.find((t) => t.slug === "blank")?.id ===
                            activeTemplateId
                          ? "border-primary bg-primary/5"
                          : "border-muted-foreground/25",
                      )}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                          <Plus className="h-6 w-6" aria-hidden="true" />
                        </div>
                        <div className="font-semibold">Build Your Own</div>
                        <div className="text-xs text-muted-foreground">
                          Start from a blank canvas and design every section
                          yourself
                        </div>
                      </div>
                    </button>
                  )}
                  {pageItems.map((t) => {
                    const isActive = activeTemplateId === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setConfirm(t)}
                        disabled={disabled || pickMutation.isPending}
                        className={cn(
                          "group flex flex-col overflow-hidden rounded-lg border text-left transition-all",
                          "hover:border-foreground/50 disabled:cursor-not-allowed disabled:opacity-60",
                          isActive &&
                            "border-foreground ring-2 ring-foreground/20",
                        )}
                      >
                        <div
                          className="h-24 w-full"
                          style={{ background: templatePrimary(t) }}
                        />
                        <div className="flex flex-1 flex-col gap-1 p-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{t.name}</span>
                            {isActive && (
                              <CheckCircle2
                                className="h-4 w-4 text-foreground"
                                aria-label="Active template"
                              />
                            )}
                          </div>
                          {t.description && (
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {t.description}
                            </p>
                          )}
                          {t.category && (
                            <Badge
                              variant="secondary"
                              className="mt-auto self-start text-[10px]"
                            >
                              {t.category}
                            </Badge>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {filtered.length > 0 && totalPages > 1 && (
                <Pagination
                  page={safePage}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  total={filtered.length}
                  pageStart={pageStart}
                  pageSize={PAGE_SIZE}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={confirm !== null}
        onOpenChange={(v) => {
          if (!v) setConfirm(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch to {confirm?.name}?</DialogTitle>
            <DialogDescription>
              Choose whether to keep your current branding customizations or
              reset them to the {confirm?.name} defaults.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirm(null)}
              disabled={pickMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePick(false)}
              disabled={pickMutation.isPending}
            >
              Keep my branding
            </Button>
            <Button
              onClick={() => handlePick(true)}
              disabled={pickMutation.isPending}
            >
              {pickMutation.isPending ? "Applying…" : "Reset to defaults"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CategoryChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
  total,
  pageStart,
  pageSize,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  total: number;
  pageStart: number;
  pageSize: number;
}) {
  const showing = Math.min(pageSize, total - pageStart);
  return (
    <div className="flex flex-col items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground sm:flex-row">
      <span>
        Showing {pageStart + 1}–{pageStart + showing} of {total}
      </span>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
        >
          Prev
        </Button>
        {Array.from({ length: totalPages }).map((_, i) => {
          const p = i + 1;
          return (
            <Button
              key={p}
              size="sm"
              variant={p === page ? "default" : "ghost"}
              onClick={() => onPageChange(p)}
              className="h-8 w-8 p-0"
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </Button>
          );
        })}
        <Button
          size="sm"
          variant="outline"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
