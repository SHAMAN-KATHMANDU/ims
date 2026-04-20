"use client";

import { useState } from "react";
import { Loader2, Pencil, Trash2, Plus, ExternalLink } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCollections,
  useCreateCollection,
  useUpdateCollection,
  useDeleteCollection,
  type Collection,
} from "../hooks/use-collections";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface CreateFormState {
  title: string;
  slug: string;
  subtitle: string;
  isActive: boolean;
}

const EMPTY_CREATE: CreateFormState = {
  title: "",
  slug: "",
  subtitle: "",
  isActive: true,
};

export function CollectionsPage() {
  const { data: collections = [], isLoading } = useCollections();
  const createMutation = useCreateCollection();
  const updateMutation = useUpdateCollection();
  const deleteMutation = useDeleteCollection();

  const [form, setForm] = useState<CreateFormState>(EMPTY_CREATE);
  const [slugTouched, setSlugTouched] = useState(false);

  const [editing, setEditing] = useState<Collection | null>(null);
  const [editForm, setEditForm] = useState<CreateFormState>(EMPTY_CREATE);
  const [editSlugTouched, setEditSlugTouched] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleTitleChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: slugTouched ? prev.slug : slugify(value),
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.slug.trim()) return;
    await createMutation.mutateAsync({
      title: form.title.trim(),
      slug: form.slug.trim(),
      subtitle: form.subtitle.trim() || undefined,
      isActive: form.isActive,
    });
    setForm(EMPTY_CREATE);
    setSlugTouched(false);
  };

  const openEdit = (c: Collection) => {
    setEditing(c);
    setEditForm({
      title: c.title,
      slug: c.slug,
      subtitle: c.subtitle ?? "",
      isActive: c.isActive,
    });
    setEditSlugTouched(false);
  };

  const handleEditTitleChange = (value: string) => {
    setEditForm((prev) => ({
      ...prev,
      title: value,
      slug: editSlugTouched ? prev.slug : slugify(value),
    }));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !editForm.title.trim() || !editForm.slug.trim()) return;
    await updateMutation.mutateAsync({
      id: editing.id,
      payload: {
        title: editForm.title.trim(),
        slug: editForm.slug.trim(),
        subtitle: editForm.subtitle.trim() || null,
        isActive: editForm.isActive,
      },
    });
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Collections</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Curated product groups (e.g. &ldquo;Exclusives&rdquo;, &ldquo;New
          Arrivals&rdquo;) that appear on your website via collection blocks and
          at{" "}
          <span className="font-mono text-xs">/collections/&lt;slug&gt;</span>.
        </p>
      </div>

      {/* Create form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">New collection</CardTitle>
          <CardDescription>
            Collections are immediately available in the site editor&apos;s
            product-grid block.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="col-title">Title</Label>
                <Input
                  id="col-title"
                  placeholder="Summer Exclusives"
                  value={form.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="col-slug">Slug</Label>
                <Input
                  id="col-slug"
                  placeholder="summer-exclusives"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setForm((prev) => ({ ...prev, slug: e.target.value }));
                  }}
                  maxLength={60}
                  pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="col-subtitle">Subtitle (optional)</Label>
              <Textarea
                id="col-subtitle"
                placeholder="A short description shown on the collection page"
                value={form.subtitle}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, subtitle: e.target.value }))
                }
                maxLength={300}
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="col-active"
                  checked={form.isActive}
                  onCheckedChange={(v) =>
                    setForm((prev) => ({ ...prev, isActive: v }))
                  }
                />
                <Label htmlFor="col-active" className="cursor-pointer">
                  Active
                </Label>
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={
                  !form.title.trim() ||
                  !form.slug.trim() ||
                  createMutation.isPending
                }
              >
                {createMutation.isPending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                )}
                Create
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : collections.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No collections yet. Create one above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-right">Products</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.title}</div>
                      {c.subtitle && (
                        <div className="text-xs text-muted-foreground truncate max-w-xs">
                          {c.subtitle}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">
                        {c.slug}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {c.productCount}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.isActive ? "default" : "secondary"}>
                        {c.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(c)}
                          aria-label={`Edit ${c.title}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(c.id)}
                          aria-label={`Delete ${c.title}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit collection</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-col-title">Title</Label>
                <Input
                  id="edit-col-title"
                  value={editForm.title}
                  onChange={(e) => handleEditTitleChange(e.target.value)}
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-col-slug">Slug</Label>
                <Input
                  id="edit-col-slug"
                  value={editForm.slug}
                  onChange={(e) => {
                    setEditSlugTouched(true);
                    setEditForm((prev) => ({ ...prev, slug: e.target.value }));
                  }}
                  maxLength={60}
                  pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />
                  /collections/{editForm.slug || "…"}
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-col-subtitle">Subtitle (optional)</Label>
              <Textarea
                id="edit-col-subtitle"
                value={editForm.subtitle}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, subtitle: e.target.value }))
                }
                maxLength={300}
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="edit-col-active"
                checked={editForm.isActive}
                onCheckedChange={(v) =>
                  setEditForm((prev) => ({ ...prev, isActive: v }))
                }
              />
              <Label htmlFor="edit-col-active" className="cursor-pointer">
                Active
              </Label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  !editForm.title.trim() ||
                  !editForm.slug.trim() ||
                  updateMutation.isPending
                }
              >
                {updateMutation.isPending && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete collection?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the collection and its product memberships. Products
              themselves are not deleted.
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
    </div>
  );
}
