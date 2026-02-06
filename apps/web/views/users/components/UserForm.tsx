"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import type { User } from "@/hooks/useUser";
import { UserRole } from "@repo/shared";

const createUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["user", "admin", "superAdmin"], {
    required_error: "Role is required",
  }),
});

const updateUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 6, {
      message: "Password must be at least 6 characters",
    }),
  role: z.enum(["user", "admin", "superAdmin"], {
    required_error: "Role is required",
  }),
});

type UserFormValues = z.infer<typeof createUserSchema>;

interface UserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingUser: User | null;
  onSubmit: (data: UserFormValues) => Promise<void>;
  onReset: () => void;
  /** When true, render form only (no Dialog/trigger). For use on dedicated pages (e.g. mobile). */
  inline?: boolean;
  /** When false, do not render the Dialog trigger (parent opens dialog). Default true. */
  renderTrigger?: boolean;
}

export function UserForm({
  open,
  onOpenChange,
  editingUser,
  onSubmit,
  onReset,
  inline = false,
  renderTrigger = true,
}: UserFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(editingUser ? updateUserSchema : createUserSchema),
    defaultValues: {
      username: "",
      password: "",
      role: UserRole.USER,
    },
  });

  useEffect(() => {
    if (editingUser) {
      reset({
        username: editingUser.username,
        password: "",
        role: editingUser.role,
      });
    } else {
      reset({
        username: "",
        password: "",
        role: UserRole.USER,
      });
    }
  }, [editingUser, open, reset]);

  const handleCancel = () => {
    onOpenChange(false);
    onReset();
  };

  const formContent = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" {...register("username")} />
        {errors.username && (
          <p className="text-sm text-destructive">{errors.username.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">
          {editingUser
            ? "New Password (leave blank to keep current)"
            : "Password"}
        </Label>
        <Input id="password" type="password" {...register("password")} />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="superAdmin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.role && (
          <p className="text-sm text-destructive">{errors.role.message}</p>
        )}
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : editingUser ? "Update" : "Add"}
        </Button>
      </div>
    </form>
  );

  if (inline) {
    return (
      <div className="max-w-lg space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">
            {editingUser ? "Edit User" : "Add User"}
          </h2>
          <p className="text-muted-foreground text-sm">
            {editingUser
              ? "Update user username and role."
              : "Create a new user account."}
          </p>
        </div>
        {formContent}
      </div>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onReset();
        onOpenChange(o);
      }}
    >
      {renderTrigger && (
        <DialogTrigger asChild>
          <Button className="gap-2" onClick={() => onReset()}>
            <Plus className="h-4 w-4" /> Add User
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingUser ? "Edit User" : "Add User"}</DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}

export type { UserFormValues };
