"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  useDiscountTypes,
  useCreateDiscountType,
  useUpdateDiscountType,
  useDeleteDiscountType,
  type DiscountType,
} from "@/features/products";
import { Loader2, Pencil, Trash2 } from "lucide-react";

function toNumber(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function DiscountTypesCard() {
  const { data: discountTypes = [], isLoading } = useDiscountTypes();
  const createMutation = useCreateDiscountType();
  const updateMutation = useUpdateDiscountType();
  const deleteMutation = useDeleteDiscountType();

  const [name, setName] = useState("");
  const [percentage, setPercentage] = useState<string>("");
  const [description, setDescription] = useState("");
  const [editing, setEditing] = useState<DiscountType | null>(null);
  const [editName, setEditName] = useState("");
  const [editPercentage, setEditPercentage] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const pct = percentage.trim() === "" ? undefined : Number(percentage);
    if (pct !== undefined && (pct < 0 || pct > 100)) return;
    createMutation.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        defaultPercentage: pct,
      },
      {
        onSuccess: () => {
          setName("");
          setPercentage("");
          setDescription("");
        },
      },
    );
  };

  const openEdit = (dt: DiscountType) => {
    setEditing(dt);
    setEditName(dt.name);
    setEditPercentage(
      dt.defaultPercentage != null ? String(dt.defaultPercentage) : "",
    );
    setEditDescription(dt.description ?? "");
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const pct =
      editPercentage.trim() === ""
        ? undefined
        : Math.min(100, Math.max(0, Number(editPercentage)));
    updateMutation.mutate(
      {
        id: editing.id,
        data: {
          name: editName.trim(),
          description: editDescription.trim() || undefined,
          defaultPercentage: pct,
        },
      },
      { onSuccess: () => setEditing(null) },
    );
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Discount types</CardTitle>
          <CardDescription>
            Add discounts by name and default percentage. These can be assigned
            to products when editing a product.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={handleCreate}
            className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 p-3"
          >
            <div className="space-y-1">
              <Label htmlFor="dt-name" className="text-xs">
                Name
              </Label>
              <Input
                id="dt-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Member"
                className="h-9 w-40"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dt-pct" className="text-xs">
                % off (0–100)
              </Label>
              <Input
                id="dt-pct"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                placeholder="10"
                className="h-9 w-24"
              />
            </div>
            <div className="space-y-1 flex-1 min-w-[160px]">
              <Label htmlFor="dt-desc" className="text-xs">
                Description (optional)
              </Label>
              <Input
                id="dt-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="h-9"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending || !name.trim()}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Add discount"
              )}
            </Button>
          </form>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-24 text-right">% off</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discountTypes.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground py-6"
                    >
                      No discount types yet. Add one above.
                    </TableCell>
                  </TableRow>
                ) : (
                  discountTypes.map((dt) => (
                    <TableRow key={dt.id}>
                      <TableCell className="font-medium">{dt.name}</TableCell>
                      <TableCell className="text-right">
                        {toNumber(dt.defaultPercentage) != null
                          ? `${toNumber(dt.defaultPercentage)}%`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {dt.description ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(dt)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(dt.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit discount type</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>% off (0–100)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={editPercentage}
                onChange={(e) => setEditPercentage(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete discount type?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. If this discount type is used on any
              products, deletion will fail. Remove it from those products first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
