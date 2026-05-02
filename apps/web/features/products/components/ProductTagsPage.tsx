"use client";

/**
 * ProductTagsPage — settings tab for managing tenant product tags.
 *
 * Mirrors the AttributeTypesPage layout (Card + paginated DataTable + inline
 * "Add" form + edit/delete row actions). Tags are name-only and
 * internal-only — never reach /public/* routes.
 */

import { useState } from "react";
import { useToast } from "@/hooks/useToast";
import {
  useProductTags,
  useCreateProductTag,
  useUpdateProductTag,
  useDeleteProductTag,
  type ProductTag,
} from "@/features/products";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Pencil, Plus, Trash2 } from "lucide-react";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

export function ProductTagsPage() {
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useProductTags({
    page,
    limit: pageSize,
    search: search.trim() || undefined,
  });
  const tags = data?.tags ?? [];
  const pagination = data?.pagination;

  const createTag = useCreateProductTag();
  const updateTag = useUpdateProductTag();
  const deleteTag = useDeleteProductTag();
  const { toast } = useToast();

  // Inline create / edit dialog state.
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<ProductTag | null>(null);
  const [tagName, setTagName] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<ProductTag | null>(null);

  const openCreateDialog = () => {
    setEditingTag(null);
    setTagName("");
    setTagDialogOpen(true);
  };

  const openEditDialog = (tag: ProductTag) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setTagDialogOpen(true);
  };

  const handleSubmit = async () => {
    const trimmed = tagName.trim();
    if (!trimmed) return;
    try {
      if (editingTag) {
        await updateTag.mutateAsync({ id: editingTag.id, name: trimmed });
        toast({ title: "Tag renamed" });
      } else {
        await createTag.mutateAsync(trimmed);
        toast({ title: `Tag "${trimmed}" created` });
      }
      setTagDialogOpen(false);
      setEditingTag(null);
      setTagName("");
    } catch {
      // Error toasts handled by the mutation hook.
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTag.mutateAsync(deleteTarget.id);
      toast({ title: `Tag "${deleteTarget.name}" deleted` });
    } catch {
      // Error toasts handled by the mutation hook.
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Product Tags</CardTitle>
          <CardDescription>
            Internal-only labels for organising your catalogue. Tags never
            appear on the public storefront or Public Data API.
          </CardDescription>
        </div>
        <Button onClick={openCreateDialog} className="shrink-0">
          <Plus className="h-4 w-4 mr-1" aria-hidden />
          Add tag
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(DEFAULT_PAGE);
          }}
          aria-label="Search tags"
          placeholder="Search tags…"
        />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="text-center text-sm text-muted-foreground"
                >
                  Loading tags…
                </TableCell>
              </TableRow>
            ) : tags.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="text-center text-sm text-muted-foreground"
                >
                  {search.trim()
                    ? "No tags match your search."
                    : "No tags yet. Click “Add tag” to create one."}
                </TableCell>
              </TableRow>
            ) : (
              tags.map((tag) => (
                <TableRow key={tag.id}>
                  <TableCell className="font-medium">{tag.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditDialog(tag)}
                        aria-label={`Rename tag ${tag.name}`}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteTarget(tag)}
                        aria-label={`Delete tag ${tag.name}`}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {pagination && pagination.totalPages > 1 && (
          <DataTablePagination
            pagination={{
              currentPage: page,
              totalPages: pagination.totalPages,
              totalItems: pagination.totalItems,
              itemsPerPage: pageSize,
              hasNextPage: page < pagination.totalPages,
              hasPrevPage: page > 1,
            }}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(DEFAULT_PAGE);
            }}
            itemLabel="tags"
          />
        )}
      </CardContent>

      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{editingTag ? "Rename tag" : "Add tag"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="catalog-product-tag-name">Tag name</Label>
            <Input
              id="catalog-product-tag-name"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              placeholder="e.g. Sale, New Arrival"
              maxLength={100}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTagDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                !tagName.trim() || createTag.isPending || updateTag.isPending
              }
            >
              {editingTag ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleteTarget?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Products that currently have this tag will simply lose the link —
              no products are deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
