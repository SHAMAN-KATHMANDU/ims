"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { usePromosQuery } from "../../hooks/use-promos";
import {
  useCreatePromo,
  useUpdatePromo,
  useDeletePromo,
} from "../../hooks/use-promos";
import type { PromoCode } from "../../services/promos.service";
import { CreateOfferSchema, type CreateOfferInput } from "../validation";

interface OfferEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promo: PromoCode | null;
  onClose: () => void;
}

export function OfferEditorDialog({
  open,
  onOpenChange,
  promo,
  onClose,
}: OfferEditorDialogProps) {
  const createPromo = useCreatePromo();
  const updatePromo = useUpdatePromo();
  const deletePromo = useDeletePromo();
  const promosQuery = usePromosQuery();
  const [promoSearch, setPromoSearch] = useState("");

  const allPromos = promosQuery.data?.promos ?? [];
  const filteredPromos = allPromos.filter((p) =>
    p.code.toLowerCase().includes(promoSearch.toLowerCase()),
  );

  const form = useForm<CreateOfferInput>({
    resolver: zodResolver(CreateOfferSchema),
    defaultValues: {
      code: "",
      title: "",
      type: "Discount",
      value: "",
      appliesToAll: true,
      appliesTo: [],
      startDate: "",
      endDate: "",
      maxUses: "",
      perCustomerLimit: "",
      promoCodeIds: [],
    },
  });

  useEffect(() => {
    if (promo) {
      form.reset({
        code: promo.code,
        title: promo.description || "",
        type: "Discount",
        value: `${promo.valueType === "PERCENTAGE" ? promo.value : promo.value}`,
        appliesToAll: promo.applyToAll ?? true,
        appliesTo: promo.productIds ?? [],
        startDate: promo.validFrom
          ? new Date(promo.validFrom).toISOString().split("T")[0]
          : "",
        endDate: promo.validTo
          ? new Date(promo.validTo).toISOString().split("T")[0]
          : "",
        maxUses: promo.usageLimit?.toString() ?? "",
        perCustomerLimit: "",
        promoCodeIds: [],
      });
    } else {
      form.reset({
        code: "",
        title: "",
        type: "Discount",
        value: "",
        appliesToAll: true,
        appliesTo: [],
        startDate: "",
        endDate: "",
        maxUses: "",
        perCustomerLimit: "",
        promoCodeIds: [],
      });
    }
  }, [promo, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      const payload = {
        code: values.code,
        description: values.title,
        valueType: "PERCENTAGE" as const,
        value:
          typeof values.value === "string"
            ? parseFloat(values.value)
            : values.value,
        eligibility: "ALL" as const,
        validFrom: values.startDate ? new Date(values.startDate) : undefined,
        validTo: values.endDate ? new Date(values.endDate) : undefined,
        usageLimit: values.maxUses
          ? parseInt(values.maxUses.toString())
          : undefined,
        applyToAll: values.appliesToAll,
        productIds: values.appliesTo,
        promoCodeIds: values.promoCodeIds || [],
      };

      if (promo) {
        await updatePromo.mutateAsync({ id: promo.id, payload });
      } else {
        await createPromo.mutateAsync(payload);
      }

      onClose();
      onOpenChange(false);
      form.reset();
    } catch {
      /* error handled by mutation */
    }
  });

  const handleDelete = async () => {
    if (promo) {
      try {
        await deletePromo.mutateAsync(promo.id);
        onClose();
        onOpenChange(false);
      } catch {
        /* error handled by mutation */
      }
    }
  };

  const isSubmitting = createPromo.isPending || updatePromo.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{promo ? "Edit promo" : "New promo"}</DialogTitle>
          <DialogDescription>
            {promo
              ? "Update the promo code details."
              : "Create a new promo code."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              placeholder="e.g., SUMMER20"
              {...form.register("code")}
              disabled={isSubmitting}
            />
            {form.formState.errors.code && (
              <p className="text-xs text-destructive">
                {form.formState.errors.code.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Description</Label>
            <Input
              id="title"
              placeholder="e.g., Summer sale"
              {...form.register("title")}
              disabled={isSubmitting}
            />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">Value (%)</Label>
            <Input
              id="value"
              type="number"
              placeholder="e.g., 20"
              {...form.register("value")}
              disabled={isSubmitting}
            />
            {form.formState.errors.value && (
              <p className="text-xs text-destructive">
                {form.formState.errors.value.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Applies to</Label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={form.watch("appliesToAll")}
                  onChange={() => form.setValue("appliesToAll", true)}
                  disabled={isSubmitting}
                />
                <span className="text-sm">All products</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!form.watch("appliesToAll")}
                  onChange={() => form.setValue("appliesToAll", false)}
                  disabled={isSubmitting}
                />
                <span className="text-sm">Specific items</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start date</Label>
              <Input
                id="startDate"
                type="date"
                {...form.register("startDate")}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End date</Label>
              <Input
                id="endDate"
                type="date"
                {...form.register("endDate")}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxUses">Max uses</Label>
            <Input
              id="maxUses"
              type="number"
              placeholder="Leave empty for unlimited"
              {...form.register("maxUses")}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="promoSearch">Link promo codes</Label>
            <Input
              id="promoSearch"
              placeholder="Search promo codes..."
              value={promoSearch}
              onChange={(e) => setPromoSearch(e.target.value)}
              disabled={isSubmitting || promosQuery.isLoading}
            />
            {promosQuery.isLoading && (
              <div className="text-xs text-muted-foreground">
                Loading promos...
              </div>
            )}
            {filteredPromos.length > 0 && (
              <div className="border rounded-md max-h-48 overflow-y-auto bg-white">
                {filteredPromos.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      const currentIds = form.getValues("promoCodeIds") || [];
                      if (!currentIds.includes(p.id)) {
                        form.setValue("promoCodeIds", [...currentIds, p.id]);
                        setPromoSearch("");
                      }
                    }}
                    disabled={
                      isSubmitting ||
                      (form.getValues("promoCodeIds") || []).includes(p.id)
                    }
                    className="w-full text-left px-3 py-2 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-sm border-b last:border-b-0"
                  >
                    <div className="font-mono text-xs">{p.code}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.value}% {p.valueType === "PERCENTAGE" ? "off" : ""}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {promoSearch &&
              filteredPromos.length === 0 &&
              !promosQuery.isLoading && (
                <div className="text-xs text-muted-foreground text-center py-2">
                  No matching promos
                </div>
              )}
            {(form.getValues("promoCodeIds") || []).length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {(form.getValues("promoCodeIds") || [])
                  .map((id) => allPromos.find((p) => p.id === id))
                  .filter(Boolean)
                  .map((p) => (
                    <div
                      key={p!.id}
                      className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 rounded px-2 py-1 text-xs"
                    >
                      <span className="font-mono">{p!.code}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const currentIds =
                            form.getValues("promoCodeIds") || [];
                          form.setValue(
                            "promoCodeIds",
                            currentIds.filter((id) => id !== p!.id),
                          );
                        }}
                        disabled={isSubmitting}
                        className="hover:text-blue-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            {promo && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="mr-auto"
                    disabled={isSubmitting || deletePromo.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete promo?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="flex gap-2 justify-end">
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={deletePromo.isPending}
                    >
                      {deletePromo.isPending ? "Deleting…" : "Delete"}
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onClose();
                onOpenChange(false);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? promo
                  ? "Updating…"
                  : "Creating…"
                : promo
                  ? "Update"
                  : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
