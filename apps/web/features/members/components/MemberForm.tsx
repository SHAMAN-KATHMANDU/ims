"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  type Member,
  type CreateMemberData,
  type UpdateMemberData,
} from "../hooks/use-members";
import { MemberFormSchema, type MemberFormInput } from "../validation";
import { Plus, Loader2 } from "lucide-react";

interface MemberFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: Member | null;
  onSubmit: (data: CreateMemberData | UpdateMemberData) => Promise<void>;
  isLoading?: boolean;
  /** When true, render form only (no Dialog/trigger). For use on dedicated pages (e.g. mobile). */
  inline?: boolean;
}

const defaultValues: MemberFormInput = {
  phone: "",
  name: "",
  email: "",
  notes: "",
  gender: "",
  age: undefined,
  address: "",
  birthday: "",
  isActive: true,
  memberStatus: "ACTIVE",
};

export function MemberForm({
  open,
  onOpenChange,
  member,
  onSubmit,
  isLoading,
  inline = false,
}: MemberFormProps) {
  const isEdit = !!member;

  const form = useForm<MemberFormInput>({
    resolver: zodResolver(MemberFormSchema),
    mode: "onBlur",
    defaultValues,
  });

  useEffect(() => {
    if (open && member) {
      form.reset({
        phone: member.phone,
        name: member.name || "",
        email: member.email || "",
        notes: member.notes || "",
        gender: member.gender || "",
        age: member.age ?? undefined,
        address: member.address || "",
        birthday: member.birthday ? member.birthday.slice(0, 10) : "",
        isActive: member.isActive,
        memberStatus: (member.memberStatus || "ACTIVE") as
          | "ACTIVE"
          | "INACTIVE"
          | "PROSPECT"
          | "VIP",
      });
    } else if (!open) {
      form.reset(defaultValues);
    }
  }, [open, member, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    const commonData = {
      phone: values.phone,
      name: values.name?.trim() || undefined,
      email: values.email?.trim() || undefined,
      notes: values.notes?.trim() || undefined,
      gender: values.gender?.trim() || undefined,
      age: values.age,
      address: values.address?.trim() || undefined,
      birthday: values.birthday || undefined,
    };

    if (isEdit) {
      await onSubmit({
        ...commonData,
        isActive: values.isActive,
        memberStatus: values.memberStatus,
      });
    } else {
      await onSubmit(commonData);
    }
  });

  const formContent = (
    <form onSubmit={handleSubmit}>
      {!inline && (
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Member" : "Add New Member"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update member information."
              : "Register a new member with their phone number."}
          </DialogDescription>
        </DialogHeader>
      )}
      {inline && (
        <div className="space-y-1 mb-4">
          <h2 className="text-2xl font-semibold">
            {isEdit ? "Edit Member" : "Add New Member"}
          </h2>
          <p className="text-muted-foreground text-sm">
            {isEdit
              ? "Update member information."
              : "Register a new member with their phone number."}
          </p>
        </div>
      )}

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="phone-number">Phone Number *</Label>
          <Controller
            name="phone"
            control={form.control}
            render={({ field }) => (
              <PhoneInput
                value={field.value}
                onChange={(v) => field.onChange(v ?? "")}
                onBlur={field.onBlur}
                numberInputId="phone-number"
                placeholder="e.g. 9841234567"
              />
            )}
          />
          {form.formState.errors.phone && (
            <p
              id="phone-number-error"
              role="alert"
              className="text-sm text-destructive mt-1"
            >
              {form.formState.errors.phone.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            {...form.register("name")}
            placeholder="Customer name (optional)"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...form.register("email")}
            placeholder="Email address (optional)"
            aria-invalid={!!form.formState.errors.email}
            aria-describedby={
              form.formState.errors.email ? "email-error" : undefined
            }
          />
          {form.formState.errors.email && (
            <p
              id="email-error"
              role="alert"
              className="text-sm text-destructive mt-1"
            >
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            {...form.register("notes")}
            placeholder="Any additional notes..."
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Input
              id="gender"
              {...form.register("gender")}
              placeholder="e.g. Male, Female, Other"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="age">Age</Label>
            <Input
              id="age"
              type="number"
              min={0}
              {...form.register("age")}
              placeholder="Age in years"
              aria-invalid={!!form.formState.errors.age}
              aria-describedby={
                form.formState.errors.age ? "age-error" : undefined
              }
            />
            {form.formState.errors.age && (
              <p
                id="age-error"
                role="alert"
                className="text-sm text-destructive mt-1"
              >
                {form.formState.errors.age.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            {...form.register("address")}
            placeholder="Customer address"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="birthday">Birthday</Label>
          <Input id="birthday" type="date" {...form.register("birthday")} />
        </div>

        {isEdit && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">Active Status</Label>
              <Controller
                name="isActive"
                control={form.control}
                render={({ field }) => (
                  <Switch
                    id="isActive"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memberStatus">Member Status</Label>
              <Controller
                name="memberStatus"
                control={form.control}
                render={({ field }) => (
                  <select
                    id="memberStatus"
                    aria-label="Member status"
                    className="border rounded-md px-3 py-2 text-sm w-full bg-background"
                    value={field.value ?? "ACTIVE"}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value as
                          | "ACTIVE"
                          | "INACTIVE"
                          | "PROSPECT"
                          | "VIP",
                      )
                    }
                    onBlur={field.onBlur}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="PROSPECT">Prospect</option>
                    <option value="VIP">VIP</option>
                  </select>
                )}
              />
            </div>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2
                className="mr-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
              {isEdit ? "Updating..." : "Creating..."}
            </>
          ) : isEdit ? (
            "Update Member"
          ) : (
            "Add Member"
          )}
        </Button>
      </DialogFooter>
    </form>
  );

  if (inline) {
    return <div className="max-w-lg">{formContent}</div>;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!isEdit && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add Member
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]" allowDismiss={false}>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
