"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { GripVertical, Plus, Search, Trash2, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useProductsPaginated,
  type Product,
} from "@/features/products/hooks/use-products";

interface ProductPickerFieldProps {
  value: string[] | undefined;
  onChange: (ids: string[]) => void;
  max?: number;
}

function photoUrl(product: Product): string | null {
  const v = product.variations?.[0];
  if (!v) return null;
  const photo = v.photos?.[0];
  return (photo as { photoUrl?: string } | undefined)?.photoUrl ?? null;
}

export function ProductPickerField({
  value,
  onChange,
  max = 50,
}: ProductPickerFieldProps) {
  const selected = value ?? [];
  const [open, setOpen] = useState(false);

  const remove = (id: string) => onChange(selected.filter((s) => s !== id));
  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    const next = [...selected];
    [next[idx - 1]!, next[idx]!] = [next[idx]!, next[idx - 1]!];
    onChange(next);
  };
  const moveDown = (idx: number) => {
    if (idx >= selected.length - 1) return;
    const next = [...selected];
    [next[idx]!, next[idx + 1]!] = [next[idx + 1]!, next[idx]!];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Products ({selected.length})</Label>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              disabled={selected.length >= max}
            >
              <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              Add products
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Select products</DialogTitle>
            </DialogHeader>
            <ProductSearchList
              selected={selected}
              onToggle={(id) => {
                if (selected.includes(id)) {
                  onChange(selected.filter((s) => s !== id));
                } else if (selected.length < max) {
                  onChange([...selected, id]);
                }
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {selected.length > 0 ? (
        <SelectedProductList
          ids={selected}
          onRemove={remove}
          onMoveUp={moveUp}
          onMoveDown={moveDown}
        />
      ) : (
        <div className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
          No products selected. Click &quot;Add products&quot; to pick from your
          catalog.
        </div>
      )}
    </div>
  );
}

function ProductSearchList({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const query = useProductsPaginated({ page, limit: 20, search });
  const products = query.data?.data ?? [];
  const totalPages = query.data?.pagination?.totalPages ?? 1;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search products..."
          className="pl-9"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Clear search"
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="max-h-[360px] overflow-y-auto space-y-1">
        {query.isLoading && (
          <div className="p-4 text-center text-xs text-muted-foreground">
            Loading...
          </div>
        )}
        {!query.isLoading && products.length === 0 && (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No products found.
          </div>
        )}
        {products.map((p) => {
          const checked = selected.includes(p.id);
          const img = photoUrl(p);
          return (
            <label
              key={p.id}
              className={`flex cursor-pointer items-center gap-3 rounded-md border p-2 transition-colors ${
                checked
                  ? "border-primary bg-primary/5"
                  : "border-transparent hover:border-border"
              }`}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => onToggle(p.id)}
              />
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[9px] text-muted-foreground">
                    {p.imsCode?.slice(0, 4)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  {p.imsCode} · ₹{Number(p.mrp).toLocaleString("en-IN")}
                </div>
              </div>
            </label>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs">
          <Button
            size="sm"
            variant="ghost"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </Button>
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function SelectedProductList({
  ids,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  ids: string[];
  onRemove: (id: string) => void;
  onMoveUp: (idx: number) => void;
  onMoveDown: (idx: number) => void;
}) {
  const query = useProductsPaginated({ limit: 100 });
  const allProducts = query.data?.data ?? [];
  const byId = new Map(allProducts.map((p) => [p.id, p]));

  return (
    <div className="space-y-1">
      {ids.map((id, idx) => {
        const p = byId.get(id);
        const img = p ? photoUrl(p) : null;
        return (
          <div
            key={id}
            className="flex items-center gap-2 rounded-md border border-border p-1.5"
          >
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => onMoveUp(idx)}
                disabled={idx === 0}
                aria-label="Move product up"
                className="text-muted-foreground/60 hover:text-muted-foreground disabled:opacity-30"
              >
                <GripVertical
                  className="h-3 w-3 rotate-90"
                  aria-hidden="true"
                />
              </button>
              <button
                type="button"
                onClick={() => onMoveDown(idx)}
                disabled={idx === ids.length - 1}
                aria-label="Move product down"
                className="text-muted-foreground/60 hover:text-muted-foreground disabled:opacity-30"
              >
                <GripVertical
                  className="h-3 w-3 -rotate-90"
                  aria-hidden="true"
                />
              </button>
            </div>
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded bg-muted">
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-[8px] text-muted-foreground">
                  {p?.imsCode?.slice(0, 3) ?? "?"}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">
                {p?.name ?? id}
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 shrink-0"
              onClick={() => onRemove(id)}
              aria-label={`Remove ${p?.name ?? id}`}
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
