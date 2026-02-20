"use client";

import { useState, useCallback } from "react";
import {
  usePlans,
  useCreatePlan,
  useUpdatePlan,
  useDeletePlan,
  usePlanLimits,
  useUpsertPlanLimit,
  usePricingPlans,
  useUpdatePricingPlan,
  useAddOnPricingList,
  useCreateAddOnPricing,
  useUpdateAddOnPricing,
  useDeleteAddOnPricing,
  type Plan,
  type PlanLimit,
  type PricingPlan,
} from "@/hooks/usePlatformBilling";
import type { AddOnPricing, AddOnType } from "@/services/usageService";
import { useToast } from "@/hooks/useToast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit2, Trash2, Save, X, Check } from "lucide-react";

const TIERS = ["FREE", "BASIC", "PRO", "ENTERPRISE"] as const;

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

const NUMERIC_LIMIT_FIELDS = [
  { key: "maxUsers", label: "Max Users" },
  { key: "maxProducts", label: "Max Products" },
  { key: "maxLocations", label: "Max Locations" },
  { key: "maxMembers", label: "Max Members" },
  { key: "maxCategories", label: "Max Categories" },
  { key: "maxContacts", label: "Max Contacts" },
] as const;

const BOOLEAN_LIMIT_FIELDS = [
  { key: "bulkUpload", label: "Bulk Upload" },
  { key: "analytics", label: "Analytics" },
  { key: "promoManagement", label: "Promo Management" },
  { key: "auditLogs", label: "Audit Logs" },
  { key: "apiAccess", label: "API Access" },
] as const;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// Sub-tab 1: Plans
// ---------------------------------------------------------------------------

function PlansSection() {
  const { data: plans = [], isLoading } = usePlans();
  const createMutation = useCreatePlan();
  const updateMutation = useUpdatePlan();
  const deleteMutation = useDeletePlan();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    tier: "FREE" as string,
    rank: 0,
    description: "",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    slug: "",
    rank: 0,
    description: "",
    isActive: true,
    isDefault: false,
  });

  const resetCreateForm = () => {
    setForm({ name: "", slug: "", tier: "FREE", rank: 0, description: "" });
  };

  const handleNameChange = (name: string) => {
    setForm((prev) => ({ ...prev, name, slug: slugify(name) }));
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    try {
      await createMutation.mutateAsync({
        name: form.name.trim(),
        slug: form.slug,
        tier: form.tier,
        rank: form.rank,
        description: form.description || undefined,
      });
      toast({ title: "Plan created" });
      setCreateOpen(false);
      resetCreateForm();
    } catch {
      // handled by service
    }
  };

  const startEdit = (plan: Plan) => {
    setEditingId(plan.id);
    setEditForm({
      name: plan.name,
      slug: plan.slug,
      rank: plan.rank,
      description: plan.description ?? "",
      isActive: plan.isActive,
      isDefault: plan.isDefault,
    });
  };

  const handleUpdate = async (id: string) => {
    try {
      await updateMutation.mutateAsync({
        id,
        data: {
          name: editForm.name,
          slug: editForm.slug,
          rank: editForm.rank,
          isActive: editForm.isActive,
          isDefault: editForm.isDefault,
          description: editForm.description || undefined,
        },
      });
      toast({ title: "Plan updated" });
      setEditingId(null);
    } catch {
      // handled by service
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "Plan deleted" });
      setDeleteConfirmId(null);
    } catch {
      // handled by service
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Plans</CardTitle>
              <CardDescription>
                Manage plan definitions and their tiers
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                resetCreateForm();
                setCreateOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> New Plan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-center">Rank</TableHead>
                <TableHead className="text-center">Default</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-8"
                  >
                    No plans configured
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((plan) => {
                  const isEditing = editingId === plan.id;
                  return (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">
                        {isEditing ? (
                          <Input
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm((p) => ({
                                ...p,
                                name: e.target.value,
                              }))
                            }
                            className="h-8 w-36"
                          />
                        ) : (
                          plan.name
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {isEditing ? (
                          <Input
                            value={editForm.slug}
                            onChange={(e) =>
                              setEditForm((p) => ({
                                ...p,
                                slug: e.target.value,
                              }))
                            }
                            className="h-8 w-32"
                          />
                        ) : (
                          plan.slug
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{plan.tier}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editForm.rank}
                            onChange={(e) =>
                              setEditForm((p) => ({
                                ...p,
                                rank: parseInt(e.target.value) || 0,
                              }))
                            }
                            className="h-8 w-16 mx-auto"
                          />
                        ) : (
                          plan.rank
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {isEditing ? (
                          <Switch
                            checked={editForm.isDefault}
                            onCheckedChange={(v) =>
                              setEditForm((p) => ({ ...p, isDefault: v }))
                            }
                          />
                        ) : plan.isDefault ? (
                          <Check className="h-4 w-4 text-green-600 mx-auto" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {isEditing ? (
                          <Switch
                            checked={editForm.isActive}
                            onCheckedChange={(v) =>
                              setEditForm((p) => ({ ...p, isActive: v }))
                            }
                          />
                        ) : (
                          <Badge
                            variant={plan.isActive ? "default" : "secondary"}
                          >
                            {plan.isActive ? "Active" : "Inactive"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={() => handleUpdate(plan.id)}
                              disabled={updateMutation.isPending}
                              className="gap-1"
                            >
                              <Save className="h-3.5 w-3.5" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingId(null)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(plan)}
                              className="gap-1"
                            >
                              <Edit2 className="h-3.5 w-3.5" /> Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirmId(plan.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Pro Plan"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Slug</label>
              <Input
                value={form.slug}
                onChange={(e) =>
                  setForm((p) => ({ ...p, slug: e.target.value }))
                }
                placeholder="auto-generated from name"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tier</label>
              <Select
                value={form.tier}
                onValueChange={(v) => setForm((p) => ({ ...p, tier: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIERS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rank</label>
              <Input
                type="number"
                value={form.rank}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    rank: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Optional description"
                rows={3}
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

      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Plan</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete this plan? This action cannot be
            undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-tab 2: Plan Limits
// ---------------------------------------------------------------------------

function PlanLimitsSection() {
  const { data: limits = [], isLoading } = usePlanLimits();
  const upsertMutation = useUpsertPlanLimit();
  const { toast } = useToast();

  const [drafts, setDrafts] = useState<Record<string, Partial<PlanLimit>>>({});

  const getDraft = useCallback(
    (tier: string, original: PlanLimit | undefined) => {
      if (drafts[tier]) return { ...original, ...drafts[tier] };
      return original;
    },
    [drafts],
  );

  const updateDraft = (
    tier: string,
    field: string,
    value: number | boolean,
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [tier]: { ...prev[tier], [field]: value },
    }));
  };

  const handleSave = async (tier: string) => {
    const existing = limits.find((l) => l.tier === tier);
    const draft = drafts[tier];
    if (!draft) return;

    const payload: Partial<PlanLimit> & { tier: string } = {
      tier,
      ...existing,
      ...draft,
    };
    delete (payload as Record<string, unknown>)["id"];
    delete (payload as Record<string, unknown>)["createdAt"];
    delete (payload as Record<string, unknown>)["updatedAt"];

    try {
      await upsertMutation.mutateAsync(payload);
      toast({ title: `Limits for ${tier} saved` });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[tier];
        return next;
      });
    } catch {
      // handled by service
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {TIERS.map((tier) => {
        const original = limits.find((l) => l.tier === tier);
        const current = getDraft(tier, original);
        const isDirty = !!drafts[tier];

        return (
          <Card key={tier}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  <Badge variant="outline" className="mr-2">
                    {tier}
                  </Badge>
                  Limits
                </CardTitle>
                <Button
                  size="sm"
                  disabled={!isDirty || upsertMutation.isPending}
                  onClick={() => handleSave(tier)}
                  className="gap-1"
                >
                  <Save className="h-3.5 w-3.5" />
                  {upsertMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {NUMERIC_LIMIT_FIELDS.map(({ key, label }) => (
                  <div key={key} className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      {label}
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={Number(current?.[key as keyof PlanLimit] ?? 0)}
                      onChange={(e) =>
                        updateDraft(tier, key, parseInt(e.target.value) || 0)
                      }
                      className="h-8"
                    />
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 space-y-2.5">
                {BOOLEAN_LIMIT_FIELDS.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <label className="text-sm">{label}</label>
                    <Switch
                      checked={
                        (current?.[key as keyof PlanLimit] as boolean) ?? false
                      }
                      onCheckedChange={(v) => updateDraft(tier, key, v)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-tab 3: Pricing
// ---------------------------------------------------------------------------

function PricingSection() {
  const { data: plans = [], isLoading } = usePricingPlans();
  const updateMutation = useUpdatePricingPlan();
  const { toast } = useToast();

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editOriginalPrice, setEditOriginalPrice] = useState("");

  const handleSave = async (plan: PricingPlan) => {
    const price = parseFloat(editPrice);
    if (isNaN(price) || price < 0) {
      toast({ title: "Invalid price", variant: "destructive" });
      return;
    }
    const originalPrice = editOriginalPrice
      ? parseFloat(editOriginalPrice)
      : null;
    if (originalPrice !== null && (isNaN(originalPrice) || originalPrice < 0)) {
      toast({ title: "Invalid original price", variant: "destructive" });
      return;
    }
    try {
      await updateMutation.mutateAsync({
        tier: plan.tier,
        billingCycle: plan.billingCycle,
        data: { price, originalPrice },
      });
      toast({ title: "Pricing updated" });
      setEditingKey(null);
    } catch {
      // handled by service
    }
  };

  const handleToggleActive = async (plan: PricingPlan) => {
    try {
      await updateMutation.mutateAsync({
        tier: plan.tier,
        billingCycle: plan.billingCycle,
        data: { isActive: !plan.isActive },
      });
      toast({
        title: `Pricing ${plan.isActive ? "deactivated" : "activated"}`,
      });
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
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Pricing Plans</CardTitle>
          <CardDescription>
            Configure pricing per tier and billing cycle
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tier</TableHead>
              <TableHead>Billing Cycle</TableHead>
              <TableHead>Price (NPR)</TableHead>
              <TableHead>Original Price (NPR)</TableHead>
              <TableHead className="text-center">Active</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-8"
                >
                  No pricing plans configured
                </TableCell>
              </TableRow>
            ) : (
              plans.map((p) => {
                const key = `${p.tier}-${p.billingCycle}`;
                const isEditing = editingKey === key;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Badge variant="outline">{p.tier}</Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {p.billingCycle.toLowerCase()}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-28 h-8"
                        />
                      ) : (
                        `NPR ${Number(p.price).toLocaleString()}`
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editOriginalPrice}
                          onChange={(e) => setEditOriginalPrice(e.target.value)}
                          className="w-28 h-8"
                          placeholder="Optional"
                        />
                      ) : p.originalPrice ? (
                        <span className="text-muted-foreground">
                          NPR {Number(p.originalPrice).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={p.isActive}
                        onCheckedChange={() => handleToggleActive(p)}
                        disabled={updateMutation.isPending}
                      />
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleSave(p)}
                            disabled={updateMutation.isPending}
                            className="gap-1"
                          >
                            <Save className="h-3.5 w-3.5" /> Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingKey(null)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingKey(key);
                            setEditPrice(String(p.price));
                            setEditOriginalPrice(
                              p.originalPrice ? String(p.originalPrice) : "",
                            );
                          }}
                          className="gap-1"
                        >
                          <Edit2 className="h-3.5 w-3.5" /> Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sub-tab 4: Add-On Pricing
// ---------------------------------------------------------------------------

function AddOnPricingSection() {
  const { data: pricing = [], isLoading } = useAddOnPricingList();
  const createMutation = useCreateAddOnPricing();
  const updateMutation = useUpdateAddOnPricing();
  const deleteMutation = useDeleteAddOnPricing();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [newForm, setNewForm] = useState({
    type: "EXTRA_USER" as AddOnType,
    tier: "" as string,
    billingCycle: "MONTHLY" as string,
    unitPrice: "",
    minQuantity: "1",
    maxQuantity: "",
  });

  const resetNewForm = () => {
    setNewForm({
      type: "EXTRA_USER",
      tier: "",
      billingCycle: "MONTHLY",
      unitPrice: "",
      minQuantity: "1",
      maxQuantity: "",
    });
  };

  const handleCreate = async () => {
    const unitPrice = parseFloat(newForm.unitPrice);
    if (isNaN(unitPrice) || unitPrice <= 0) {
      toast({ title: "Invalid unit price", variant: "destructive" });
      return;
    }
    try {
      await createMutation.mutateAsync({
        type: newForm.type,
        tier: newForm.tier || null,
        billingCycle: newForm.billingCycle,
        unitPrice,
        minQuantity: parseInt(newForm.minQuantity) || 1,
        maxQuantity: newForm.maxQuantity ? parseInt(newForm.maxQuantity) : null,
      });
      toast({ title: "Add-on pricing created" });
      setCreateOpen(false);
      resetNewForm();
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
      setDeleteConfirmId(null);
    } catch {
      // handled by service
    }
  };

  const handleToggleActive = async (item: AddOnPricing) => {
    try {
      await updateMutation.mutateAsync({
        id: item.id,
        data: { isActive: !item.isActive },
      });
      toast({
        title: `Add-on ${item.isActive ? "deactivated" : "activated"}`,
      });
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
            <div>
              <CardTitle>Add-On Pricing</CardTitle>
              <CardDescription>
                Per-unit pricing for resource add-ons
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                resetNewForm();
                setCreateOpen(true);
              }}
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
                <TableHead>Min / Max Qty</TableHead>
                <TableHead className="text-center">Active</TableHead>
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
                    <TableCell className="capitalize">
                      {p.billingCycle.toLowerCase()}
                    </TableCell>
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
                    <TableCell className="text-center">
                      <Switch
                        checked={p.isActive}
                        onCheckedChange={() => handleToggleActive(p)}
                        disabled={updateMutation.isPending}
                      />
                    </TableCell>
                    <TableCell>
                      {editingId === p.id ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleUpdate(p.id)}
                            disabled={updateMutation.isPending}
                            className="gap-1"
                          >
                            <Save className="h-3.5 w-3.5" /> Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-3.5 w-3.5" />
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
                            className="gap-1"
                          >
                            <Edit2 className="h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirmId(p.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Add-On Pricing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select
                value={newForm.type}
                onValueChange={(v) =>
                  setNewForm((p) => ({ ...p, type: v as AddOnType }))
                }
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
              <label className="text-sm font-medium">Tier (optional)</label>
              <Select
                value={newForm.tier || "__all__"}
                onValueChange={(v) =>
                  setNewForm((p) => ({
                    ...p,
                    tier: v === "__all__" ? "" : v,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All tiers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Tiers</SelectItem>
                  {TIERS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Billing Cycle</label>
              <Select
                value={newForm.billingCycle}
                onValueChange={(v) =>
                  setNewForm((p) => ({ ...p, billingCycle: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Unit Price (NPR)</label>
              <Input
                type="number"
                value={newForm.unitPrice}
                onChange={(e) =>
                  setNewForm((p) => ({ ...p, unitPrice: e.target.value }))
                }
                placeholder="e.g. 299"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Min Quantity</label>
                <Input
                  type="number"
                  value={newForm.minQuantity}
                  onChange={(e) =>
                    setNewForm((p) => ({
                      ...p,
                      minQuantity: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Quantity</label>
                <Input
                  type="number"
                  value={newForm.maxQuantity}
                  onChange={(e) =>
                    setNewForm((p) => ({
                      ...p,
                      maxQuantity: e.target.value,
                    }))
                  }
                  placeholder="Unlimited"
                />
              </div>
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

      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Add-On Pricing</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete this add-on pricing entry? This
            action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function PlansAndPricingTab() {
  return (
    <Tabs defaultValue="plans" className="space-y-4">
      <TabsList>
        <TabsTrigger value="plans">Plans</TabsTrigger>
        <TabsTrigger value="limits">Plan Limits</TabsTrigger>
        <TabsTrigger value="pricing">Pricing</TabsTrigger>
        <TabsTrigger value="addons">Add-On Pricing</TabsTrigger>
      </TabsList>

      <TabsContent value="plans">
        <PlansSection />
      </TabsContent>

      <TabsContent value="limits">
        <PlanLimitsSection />
      </TabsContent>

      <TabsContent value="pricing">
        <PricingSection />
      </TabsContent>

      <TabsContent value="addons">
        <AddOnPricingSection />
      </TabsContent>
    </Tabs>
  );
}
