"use client";

import { useState } from "react";
import {
  useAddOnPricingList,
  useCreateAddOnPricing,
  useUpdateAddOnPricing,
  useDeleteAddOnPricing,
} from "@/hooks/usePlatformBilling";
import { useToast } from "@/hooks/useToast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type { AddOnType } from "@/services/usageService";

const ADD_ON_TYPES: AddOnType[] = [
  "EXTRA_USER",
  "EXTRA_PRODUCT",
  "EXTRA_LOCATION",
  "EXTRA_MEMBER",
  "EXTRA_CATEGORY",
  "EXTRA_CONTACT",
];

const ADD_ON_LABELS: Record<string, string> = {
  EXTRA_USER: "Extra Users",
  EXTRA_PRODUCT: "Extra Products",
  EXTRA_LOCATION: "Extra Locations",
  EXTRA_MEMBER: "Extra Members",
  EXTRA_CATEGORY: "Extra Categories",
  EXTRA_CONTACT: "Extra Contacts",
};

export function AddOnPricingTab() {
  const { data: pricing = [], isLoading } = useAddOnPricingList();
  const createMutation = useCreateAddOnPricing();
  const updateMutation = useUpdateAddOnPricing();
  const deleteMutation = useDeleteAddOnPricing();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [newType, setNewType] = useState<AddOnType>("EXTRA_USER");
  const [newPrice, setNewPrice] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");

  const handleCreate = async () => {
    const unitPrice = parseFloat(newPrice);
    if (isNaN(unitPrice) || unitPrice <= 0) {
      toast({ title: "Invalid price", variant: "destructive" });
      return;
    }
    try {
      await createMutation.mutateAsync({ type: newType, unitPrice });
      toast({ title: "Add-on pricing created" });
      setCreateOpen(false);
      setNewPrice("");
    } catch {
      // handled by service
    }
  };

  const handleUpdate = async (id: string) => {
    const unitPrice = parseFloat(editPrice);
    if (isNaN(unitPrice) || unitPrice <= 0) {
      toast({ title: "Invalid price", variant: "destructive" });
      return;
    }
    try {
      await updateMutation.mutateAsync({ id, data: { unitPrice } });
      toast({ title: "Add-on pricing updated" });
      setEditingId(null);
    } catch {
      // handled by service
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "Add-on pricing deleted" });
    } catch {
      // handled by service
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Add-On Pricing</CardTitle>
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Add Pricing
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Unit Price (NPR)</TableHead>
                <TableHead>Min/Max Qty</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricing.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-8"
                  >
                    No add-on pricing configured
                  </TableCell>
                </TableRow>
              ) : (
                pricing.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {ADD_ON_LABELS[p.type] ?? p.type}
                    </TableCell>
                    <TableCell>{p.tier ?? "All"}</TableCell>
                    <TableCell>{p.billingCycle}</TableCell>
                    <TableCell>
                      {editingId === p.id ? (
                        <Input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-28 h-8"
                        />
                      ) : (
                        `NPR ${Number(p.unitPrice).toLocaleString()}`
                      )}
                    </TableCell>
                    <TableCell>
                      {p.minQuantity}
                      {p.maxQuantity ? ` - ${p.maxQuantity}` : "+"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.isActive ? "default" : "secondary"}>
                        {p.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {editingId === p.id ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleUpdate(p.id)}
                            disabled={updateMutation.isPending}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingId(p.id);
                              setEditPrice(String(p.unitPrice));
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDelete(p.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Add-On Pricing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select
                value={newType}
                onValueChange={(v) => setNewType(v as AddOnType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADD_ON_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ADD_ON_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Unit Price (NPR)</label>
              <Input
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="e.g. 299"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
