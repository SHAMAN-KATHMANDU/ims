"use client";

/**
 * ProductTagPicker — checkbox list of tenant tags + inline "Add tag" dialog.
 *
 * Mirrors the picker pattern used on ContactForm (see
 * `apps/web/features/crm/components/contacts/ContactForm.tsx:304-394`).
 * Tags are a name-only label feature; product tags are internal-only and
 * never reach /public/* surfaces.
 */

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/useToast";
import {
  useCreateProductTag,
  useProductTags,
  type ProductTag,
} from "../hooks/use-products";

interface Props {
  /** Currently selected tag ids. */
  value: string[];
  /** Replace the selected tag ids. */
  onChange: (ids: string[]) => void;
  /** Optional label override. */
  label?: string;
  /** Optional descriptive helper text. */
  helperText?: string;
}

export function ProductTagPicker({
  value,
  onChange,
  label = "Tags",
  helperText = "Internal-only labels for organising your catalogue. Never shown on the public storefront.",
}: Props) {
  const { toast } = useToast();
  const tagsQuery = useProductTags();
  const createTag = useCreateProductTag();

  const [addOpen, setAddOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [, startTransition] = useTransition();

  const tags: ProductTag[] = useMemo(
    () => tagsQuery.data?.tags ?? [],
    [tagsQuery.data?.tags],
  );

  // When a stale id sits in `value` after the underlying tag is deleted,
  // prune it on the next list-load so the parent form state stays clean.
  useEffect(() => {
    if (!tagsQuery.data) return;
    const known = new Set(tags.map((t) => t.id));
    const filtered = value.filter((id) => known.has(id));
    if (filtered.length !== value.length) {
      onChange(filtered);
    }
    // Intentionally only re-run when the tag list changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagsQuery.data]);

  const toggle = (id: string) => {
    startTransition(() => {
      onChange(
        value.includes(id) ? value.filter((v) => v !== id) : [...value, id],
      );
    });
  };

  const handleAdd = async () => {
    const trimmed = draftName.trim();
    if (!trimmed) return;
    try {
      const tag = await createTag.mutateAsync(trimmed);
      // Pre-check the freshly-created tag.
      if (!value.includes(tag.id)) {
        onChange([...value, tag.id]);
      }
      setDraftName("");
      setAddOpen(false);
      toast({ title: `Tag "${tag.name}" ready` });
    } catch {
      // useCreateProductTag already shows a toast on error.
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAddOpen(true)}
          className="h-7"
        >
          <Plus className="h-3.5 w-3.5 mr-1" aria-hidden />
          Add tag
        </Button>
      </div>

      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}

      {tagsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading tags…</p>
      ) : tags.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground">
          <Tag className="h-4 w-4 mx-auto mb-1 opacity-60" aria-hidden />
          No tags yet. Create one with “Add tag”, or manage them in Catalog
          Settings → Tags.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const checked = value.includes(tag.id);
            const id = `product-tag-${tag.id}`;
            return (
              <label
                key={tag.id}
                htmlFor={id}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm cursor-pointer transition-colors ${
                  checked
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <Checkbox
                  id={id}
                  checked={checked}
                  onCheckedChange={() => toggle(tag.id)}
                  aria-label={`Toggle tag ${tag.name}`}
                />
                <span>{tag.name}</span>
              </label>
            );
          })}
        </div>
      )}

      <Dialog
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o);
          if (!o) setDraftName("");
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Add tag</DialogTitle>
            <DialogDescription>
              Create a tag and attach it to this product. Tags are internal —
              they never reach the public storefront or API.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="product-tag-name">Tag name</Label>
            <Input
              id="product-tag-name"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              maxLength={100}
              placeholder="e.g. Sale, New Arrival"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleAdd();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAdd}
              disabled={createTag.isPending || !draftName.trim()}
            >
              {createTag.isPending ? "Adding…" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
