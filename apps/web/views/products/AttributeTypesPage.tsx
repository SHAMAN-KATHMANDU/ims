"use client";

import { Fragment, useState } from "react";
import { useToast } from "@/hooks/useToast";
import {
  useAttributeTypes,
  useCreateAttributeType,
  useUpdateAttributeType,
  useDeleteAttributeType,
  useCreateAttributeValue,
  useUpdateAttributeValue,
  useDeleteAttributeValue,
  type AttributeType,
  type AttributeValue,
} from "@/hooks/useAttributeTypes";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";

export function AttributeTypesPage() {
  const { data: attributeTypes = [], isLoading } = useAttributeTypes();
  const createTypeMutation = useCreateAttributeType();
  const updateTypeMutation = useUpdateAttributeType();
  const deleteTypeMutation = useDeleteAttributeType();
  const createValueMutation = useCreateAttributeValue();
  const updateValueMutation = useUpdateAttributeValue();
  const deleteValueMutation = useDeleteAttributeValue();
  const { toast } = useToast();

  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<AttributeType | null>(null);
  const [typeName, setTypeName] = useState("");
  const [typeCode, setTypeCode] = useState("");
  const [typeDisplayOrder, setTypeDisplayOrder] = useState(0);

  const [valueDialogOpen, setValueDialogOpen] = useState(false);
  const [selectedTypeForValue, setSelectedTypeForValue] =
    useState<AttributeType | null>(null);
  const [editingValue, setEditingValue] = useState<AttributeValue | null>(null);
  const [valueValue, setValueValue] = useState("");
  const [valueCode, setValueCode] = useState("");
  const [valueDisplayOrder, setValueDisplayOrder] = useState(0);

  const [deleteTypeTarget, setDeleteTypeTarget] =
    useState<AttributeType | null>(null);
  const [deleteValueTarget, setDeleteValueTarget] = useState<{
    type: AttributeType;
    value: AttributeValue;
  } | null>(null);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreateType = () => {
    setEditingType(null);
    setTypeName("");
    setTypeCode("");
    setTypeDisplayOrder(attributeTypes.length);
    setTypeDialogOpen(true);
  };

  const openEditType = (type: AttributeType) => {
    setEditingType(type);
    setTypeName(type.name);
    setTypeCode(type.code);
    setTypeDisplayOrder(type.displayOrder);
    setTypeDialogOpen(true);
  };

  const saveType = async () => {
    if (!typeName.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    try {
      if (editingType) {
        await updateTypeMutation.mutateAsync({
          id: editingType.id,
          data: {
            name: typeName.trim(),
            code: typeCode.trim() || undefined,
            displayOrder: typeDisplayOrder,
          },
        });
        toast({ title: "Attribute type updated" });
      } else {
        await createTypeMutation.mutateAsync({
          name: typeName.trim(),
          code: typeCode.trim() || undefined,
          displayOrder: typeDisplayOrder,
        });
        toast({ title: "Attribute type created" });
      }
      setTypeDialogOpen(false);
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      toast({
        title: err.response?.data?.message || err.message || "Failed to save",
        variant: "destructive",
      });
    }
  };

  const openAddValue = (type: AttributeType) => {
    setSelectedTypeForValue(type);
    setEditingValue(null);
    setValueValue("");
    setValueCode("");
    setValueDisplayOrder(type.values?.length ?? 0);
    setValueDialogOpen(true);
  };

  const openEditValue = (type: AttributeType, value: AttributeValue) => {
    setSelectedTypeForValue(type);
    setEditingValue(value);
    setValueValue(value.value);
    setValueCode(value.code || "");
    setValueDisplayOrder(value.displayOrder);
    setValueDialogOpen(true);
  };

  const saveValue = async () => {
    if (!selectedTypeForValue || !valueValue.trim()) {
      toast({ title: "Value is required", variant: "destructive" });
      return;
    }
    try {
      if (editingValue) {
        await updateValueMutation.mutateAsync({
          typeId: selectedTypeForValue.id,
          valueId: editingValue.id,
          data: {
            value: valueValue.trim(),
            code: valueCode.trim() || undefined,
            displayOrder: valueDisplayOrder,
          },
        });
        toast({ title: "Value updated" });
      } else {
        await createValueMutation.mutateAsync({
          typeId: selectedTypeForValue.id,
          data: {
            value: valueValue.trim(),
            code: valueCode.trim() || undefined,
            displayOrder: valueDisplayOrder,
          },
        });
        toast({ title: "Value added" });
      }
      setValueDialogOpen(false);
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      toast({
        title: err.response?.data?.message || err.message || "Failed to save",
        variant: "destructive",
      });
    }
  };

  const confirmDeleteType = async () => {
    if (!deleteTypeTarget) return;
    try {
      await deleteTypeMutation.mutateAsync(deleteTypeTarget.id);
      toast({ title: "Attribute type deleted" });
      setDeleteTypeTarget(null);
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      toast({
        title: err.response?.data?.message || err.message || "Failed to delete",
        variant: "destructive",
      });
    }
  };

  const confirmDeleteValue = async () => {
    if (!deleteValueTarget) return;
    try {
      await deleteValueMutation.mutateAsync({
        typeId: deleteValueTarget.type.id,
        valueId: deleteValueTarget.value.id,
      });
      toast({ title: "Value deleted" });
      setDeleteValueTarget(null);
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      toast({
        title: err.response?.data?.message || err.message || "Failed to delete",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading attribute types…</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Attribute Types</CardTitle>
              <CardDescription>
                Define types (e.g. Color, Size, Material) and their values. Use
                these when creating product variations so each variation has a
                unique SKU and attributes.
              </CardDescription>
            </div>
            <Button onClick={openCreateType} className="gap-2">
              <Plus className="h-4 w-4" /> Add type
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {attributeTypes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No attribute types yet. Add one to customize product variations
              (e.g. Color, Size).
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Values</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attributeTypes.map((type) => (
                  <Fragment key={type.id}>
                    <TableRow>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleExpanded(type.id)}
                        >
                          {expandedTypes.has(type.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{type.code}</Badge>
                      </TableCell>
                      <TableCell>{type.displayOrder}</TableCell>
                      <TableCell>
                        {!type.values || type.values.length === 0 ? (
                          <span className="text-muted-foreground text-sm">
                            —
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                            {type.values
                              .sort(
                                (a, b) =>
                                  a.displayOrder - b.displayOrder ||
                                  a.value.localeCompare(b.value),
                              )
                              .map((v) => (
                                <Badge
                                  key={v.id}
                                  variant="outline"
                                  className="font-normal text-xs"
                                >
                                  {v.value}
                                </Badge>
                              ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditType(type)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteTypeTarget(type)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-1 gap-1"
                          onClick={() => openAddValue(type)}
                        >
                          <Plus className="h-3 w-3" /> Value
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedTypes.has(type.id) && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/30">
                          <div className="py-2 pl-8">
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Values
                            </p>
                            {!type.values || type.values.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                No values. Add one to use this type on
                                variations.
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {type.values.map((v) => (
                                  <Badge
                                    key={v.id}
                                    variant="outline"
                                    className="gap-1 pr-1"
                                  >
                                    {v.value}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-4 w-4"
                                      onClick={() => openEditValue(type, v)}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-4 w-4 text-destructive"
                                      onClick={() =>
                                        setDeleteValueTarget({ type, value: v })
                                      }
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Type create/edit dialog */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingType ? "Edit attribute type" : "New attribute type"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="type-name">Name</Label>
              <Input
                id="type-name"
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
                placeholder="e.g. Color, Size"
              />
            </div>
            <div>
              <Label htmlFor="type-code">
                Code (optional, auto from name if empty)
              </Label>
              <Input
                id="type-code"
                value={typeCode}
                onChange={(e) => setTypeCode(e.target.value)}
                placeholder="e.g. color, size"
              />
            </div>
            <div>
              <Label htmlFor="type-order">Display order</Label>
              <Input
                id="type-order"
                type="number"
                value={typeDisplayOrder}
                onChange={(e) =>
                  setTypeDisplayOrder(Number(e.target.value) || 0)
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTypeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveType}>
              {editingType ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Value create/edit dialog */}
      <Dialog open={valueDialogOpen} onOpenChange={setValueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingValue ? "Edit value" : "Add value"}
              {selectedTypeForValue && (
                <span className="text-muted-foreground font-normal">
                  {" "}
                  for {selectedTypeForValue.name}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="value-value">Value</Label>
              <Input
                id="value-value"
                value={valueValue}
                onChange={(e) => setValueValue(e.target.value)}
                placeholder="e.g. Red, M, Cotton"
              />
            </div>
            <div>
              <Label htmlFor="value-code">Code (optional)</Label>
              <Input
                id="value-code"
                value={valueCode}
                onChange={(e) => setValueCode(e.target.value)}
                placeholder="e.g. red, m"
              />
            </div>
            <div>
              <Label htmlFor="value-order">Display order</Label>
              <Input
                id="value-order"
                type="number"
                value={valueDisplayOrder}
                onChange={(e) =>
                  setValueDisplayOrder(Number(e.target.value) || 0)
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setValueDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveValue}>
              {editingValue ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete type confirmation */}
      <AlertDialog
        open={!!deleteTypeTarget}
        onOpenChange={(open) => !open && setDeleteTypeTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete attribute type?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete &quot;{deleteTypeTarget?.name}&quot; and all its
              values. Variations using these values may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteType}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete value confirmation */}
      <AlertDialog
        open={!!deleteValueTarget}
        onOpenChange={(open) => !open && setDeleteValueTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete value?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove &quot;{deleteValueTarget?.value.value}&quot; from{" "}
              {deleteValueTarget?.type.name}? Variations using this value may be
              affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteValue}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
