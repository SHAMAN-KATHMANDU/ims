"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { OfferFormSchema, type OfferFormInput } from "../validation";
import {
  useOffersStore,
  selectAddOffer,
  selectUpdateOffer,
  selectDeleteOffer,
} from "../store";
import type { Offer } from "../types";
import { useToast } from "@/hooks/useToast";

interface OfferEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: Offer | null;
  onClose: () => void;
}

export function OfferEditorDialog({
  open,
  onOpenChange,
  offer,
  onClose,
}: OfferEditorDialogProps) {
  const { toast } = useToast();
  const addOffer = useOffersStore(selectAddOffer);
  const updateOffer = useOffersStore(selectUpdateOffer);
  const deleteOffer = useOffersStore(selectDeleteOffer);

  const form = useForm<OfferFormInput>({
    resolver: zodResolver(OfferFormSchema),
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
    },
  });

  useEffect(() => {
    if (offer) {
      form.reset({
        code: offer.code,
        title: offer.title,
        type: offer.type,
        value: offer.value,
        appliesToAll: offer.appliesToAll,
        appliesTo: offer.appliesTo ?? [],
        startDate: offer.startDate ?? "",
        endDate: offer.endDate ?? "",
        maxUses: offer.maxUses?.toString() ?? "",
        perCustomerLimit: offer.perCustomerLimit?.toString() ?? "",
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
      });
    }
  }, [offer, form]);

  const handleSubmit = form.handleSubmit((values) => {
    if (offer) {
      updateOffer(offer.id, {
        ...values,
        maxUses: values.maxUses ? parseInt(values.maxUses) : undefined,
        perCustomerLimit: values.perCustomerLimit
          ? parseInt(values.perCustomerLimit)
          : undefined,
      });
      toast({ title: "Offer updated" });
    } else {
      addOffer({
        id: `offer-${Date.now()}`,
        ...values,
        uses: 0,
        cap: values.maxUses ? parseInt(values.maxUses) : null,
        status: values.startDate ? "scheduled" : "draft",
        window: values.startDate
          ? `${values.startDate} → ${values.endDate}`
          : "—",
        maxUses: values.maxUses ? parseInt(values.maxUses) : undefined,
        perCustomerLimit: values.perCustomerLimit
          ? parseInt(values.perCustomerLimit)
          : undefined,
      });
      toast({ title: "Offer created" });
    }
    onClose();
    onOpenChange(false);
  });

  const handleDelete = () => {
    if (offer) {
      deleteOffer(offer.id);
      toast({ title: "Offer deleted" });
      onClose();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{offer ? "Edit offer" : "New offer"}</DialogTitle>
          <DialogDescription>
            {offer
              ? "Update the offer details."
              : "Create a new promo code or special offer."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Promo code</Label>
            <Input
              id="code"
              placeholder="e.g., SUMMER20"
              {...form.register("code")}
            />
            {form.formState.errors.code && (
              <p className="text-xs text-destructive">
                {form.formState.errors.code.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g., Summer sale"
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                defaultValue={form.watch("type")}
                onValueChange={(v: any) => form.setValue("type", v)}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Discount">Discount</SelectItem>
                  <SelectItem value="Comp">Comp</SelectItem>
                  <SelectItem value="Event">Event</SelectItem>
                  <SelectItem value="Freeshipment">Free shipping</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                placeholder="e.g., 20% off"
                {...form.register("value")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Applies to</Label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={form.watch("appliesToAll")}
                  onChange={() => form.setValue("appliesToAll", true)}
                />
                <span className="text-sm">All products</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!form.watch("appliesToAll")}
                  onChange={() => form.setValue("appliesToAll", false)}
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End date</Label>
              <Input id="endDate" type="date" {...form.register("endDate")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxUses">Max uses</Label>
              <Input
                id="maxUses"
                type="number"
                placeholder="Unlimited"
                {...form.register("maxUses")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="perCustomerLimit">Per customer</Label>
              <Input
                id="perCustomerLimit"
                type="number"
                placeholder="1"
                {...form.register("perCustomerLimit")}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            {offer && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="mr-auto"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete offer?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="flex gap-2 justify-end">
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
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
            >
              Cancel
            </Button>
            <Button type="submit">{offer ? "Update" : "Create"} offer</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
