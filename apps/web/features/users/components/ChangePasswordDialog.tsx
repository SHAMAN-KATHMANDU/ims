"use client";

/**
 * Self-service password change dialog.
 *
 * Any authenticated user can open this from the TopBar user menu (or a Profile
 * page section) to change their own password. No permission gate.
 *
 * Validation mirrors the backend contract for POST /auth/me/password:
 *   - currentPassword: required (min 1)
 *   - newPassword:     min 8, max 128
 *   - confirmNewPassword: must equal newPassword
 *
 * Error handling:
 *   - 401 → inline error on `currentPassword`: "Current password is incorrect"
 *   - 429 → toast "Too many attempts. Try again in 15 minutes."
 *   - 400 → generic toast with backend message
 *   - other → generic destructive toast
 */

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

import { useChangeMyPassword } from "../hooks/use-change-my-password";
import { ChangeMyPasswordError } from "@/features/auth";

// ── Zod schema ───────────────────────────────────────────────────────────────

const ChangePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(128, "New password must be 128 characters or fewer"),
    confirmNewPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

type ChangePasswordFormValues = z.infer<typeof ChangePasswordFormSchema>;

// ── Strength hint ────────────────────────────────────────────────────────────

interface StrengthInfo {
  score: 0 | 1 | 2 | 3;
  label: string;
  hasLower: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
}

function scorePassword(pw: string): StrengthInfo {
  const hasLower = /[a-z]/.test(pw) && /[A-Z]/.test(pw);
  const hasNumber = /\d/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);
  const score = ((hasLower ? 1 : 0) +
    (hasNumber ? 1 : 0) +
    (hasSymbol ? 1 : 0)) as 0 | 1 | 2 | 3;
  const label =
    score === 0
      ? "Weak"
      : score === 1
        ? "Fair"
        : score === 2
          ? "Good"
          : "Strong";
  return { score, label, hasLower, hasNumber, hasSymbol };
}

// ── Component ────────────────────────────────────────────────────────────────

export interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const INITIAL_VALUES: ChangePasswordFormValues = {
  currentPassword: "",
  newPassword: "",
  confirmNewPassword: "",
};

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: ChangePasswordDialogProps) {
  const { toast } = useToast();
  const mutation = useChangeMyPassword();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(ChangePasswordFormSchema),
    mode: "onBlur",
    defaultValues: INITIAL_VALUES,
  });

  const newPassword = watch("newPassword") ?? "";
  const strength = useMemo(() => scorePassword(newPassword), [newPassword]);

  const closeAndReset = () => {
    reset(INITIAL_VALUES);
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    onOpenChange(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (mutation.isPending) return; // don't close mid-flight
    if (!next) closeAndReset();
    else onOpenChange(true);
  };

  const onSubmit = async (values: ChangePasswordFormValues) => {
    try {
      await mutation.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast({ title: "Password updated" });
      closeAndReset();
    } catch (error: unknown) {
      if (error instanceof ChangeMyPasswordError) {
        if (error.status === 401) {
          setError("currentPassword", {
            type: "server",
            message: "Current password is incorrect",
          });
          return;
        }
        if (error.status === 429) {
          toast({
            title: "Too many attempts",
            description: "Try again in 15 minutes.",
            variant: "destructive",
          });
          return;
        }
        if (error.status === 400) {
          toast({
            title: "Couldn't update password",
            description: error.message,
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "Couldn't update password",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Couldn't update password",
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const pending = mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent allowDismiss={!pending}>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>
            Choose a new password. You&apos;ll stay signed in after updating.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          {/* Current password */}
          <div className="space-y-2">
            <Label htmlFor="current-password">Current password</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrent ? "text" : "password"}
                autoComplete="current-password"
                className="pr-10"
                {...register("currentPassword")}
                aria-invalid={!!errors.currentPassword}
                aria-describedby={
                  errors.currentPassword ? "current-password-error" : undefined
                }
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                aria-label={
                  showCurrent
                    ? "Hide current password"
                    : "Show current password"
                }
                aria-pressed={showCurrent}
                tabIndex={-1}
              >
                {showCurrent ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {errors.currentPassword && (
              <p
                id="current-password-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {errors.currentPassword.message}
              </p>
            )}
          </div>

          {/* New password */}
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNew ? "text" : "password"}
                autoComplete="new-password"
                className="pr-10"
                {...register("newPassword")}
                aria-invalid={!!errors.newPassword}
                aria-describedby={
                  errors.newPassword
                    ? "new-password-error"
                    : "new-password-hint"
                }
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                aria-label={showNew ? "Hide new password" : "Show new password"}
                aria-pressed={showNew}
                tabIndex={-1}
              >
                {showNew ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {errors.newPassword ? (
              <p
                id="new-password-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {errors.newPassword.message}
              </p>
            ) : (
              <div id="new-password-hint" className="space-y-2">
                <StrengthIndicator strength={strength} />
                <p className="text-xs text-muted-foreground">
                  At least 8 characters. For a stronger password, mix upper &
                  lower case, a number, and a symbol.
                </p>
              </div>
            )}
          </div>

          {/* Confirm new password */}
          <div className="space-y-2">
            <Label htmlFor="confirm-new-password">Confirm new password</Label>
            <div className="relative">
              <Input
                id="confirm-new-password"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                className="pr-10"
                {...register("confirmNewPassword")}
                aria-invalid={!!errors.confirmNewPassword}
                aria-describedby={
                  errors.confirmNewPassword
                    ? "confirm-new-password-error"
                    : undefined
                }
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                aria-label={
                  showConfirm
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
                aria-pressed={showConfirm}
                tabIndex={-1}
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {errors.confirmNewPassword && (
              <p
                id="confirm-new-password-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {errors.confirmNewPassword.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeAndReset}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && (
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              {pending ? "Updating…" : "Update password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Strength indicator ───────────────────────────────────────────────────────

interface StrengthIndicatorProps {
  strength: StrengthInfo;
}

function StrengthIndicator({ strength }: StrengthIndicatorProps) {
  const segments = [0, 1, 2];
  const color =
    strength.score === 0
      ? "bg-muted"
      : strength.score === 1
        ? "bg-destructive"
        : strength.score === 2
          ? "bg-yellow-500"
          : "bg-green-500";

  return (
    <div className="space-y-1" aria-live="polite">
      <div className="flex items-center gap-2">
        <div
          className="flex h-1.5 flex-1 gap-1"
          role="progressbar"
          aria-label="Password strength"
          aria-valuemin={0}
          aria-valuemax={3}
          aria-valuenow={strength.score}
        >
          {segments.map((i) => (
            <div
              key={i}
              className={cn(
                "flex-1 rounded-full",
                i < strength.score ? color : "bg-muted",
              )}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{strength.label}</span>
      </div>
    </div>
  );
}
