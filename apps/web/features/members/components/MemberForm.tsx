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
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
    <Form {...form}>
      <form onSubmit={handleSubmit}>
        {!inline && (
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit Member" : "Add New Member"}
            </DialogTitle>
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
          {/* Phone uses numberInputId rather than the standard id prop so we
              provide an explicit htmlFor="phone-number" to maintain the
              label → input association required by the MemberForm tests. */}
          <FormField
            control={form.control}
            name="phone"
            render={({ field: _field, fieldState }) => (
              <FormItem>
                <FormLabel htmlFor="phone-number">Phone Number *</FormLabel>
                <Controller
                  name="phone"
                  control={form.control}
                  render={({ field: controllerField }) => (
                    <PhoneInput
                      value={controllerField.value}
                      onChange={(v) => controllerField.onChange(v ?? "")}
                      onBlur={controllerField.onBlur}
                      numberInputId="phone-number"
                      placeholder="e.g. 9841234567"
                    />
                  )}
                />
                {fieldState.error && (
                  <p
                    id="phone-number-error"
                    role="alert"
                    className="text-sm text-destructive mt-1"
                  >
                    {fieldState.error.message}
                  </p>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Customer name (optional)" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="Email address (optional)"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Any additional notes..."
                    rows={2}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Male, Female, Other" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min={0}
                      placeholder="Age in years"
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value),
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Customer address"
                    rows={2}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="birthday"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Birthday</FormLabel>
                <FormControl>
                  <Input {...field} type="date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {isEdit && (
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Active Status</FormLabel>
                    <FormControl>
                      <Switch
                        id="isActive"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="memberStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Member Status</FormLabel>
                    <FormControl>
                      <select
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
                    </FormControl>
                  </FormItem>
                )}
              />
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
    </Form>
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
