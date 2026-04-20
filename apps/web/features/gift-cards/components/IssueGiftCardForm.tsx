"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  IssueGiftCardFormSchema,
  type IssueGiftCardFormInput,
} from "../validation";
import { generateGiftCardCode } from "../services/giftCard.service";
import type { CreateGiftCardData } from "../types";

interface IssueGiftCardFormProps {
  onSubmit: (data: CreateGiftCardData) => Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
}

export function IssueGiftCardForm({
  onSubmit,
  isLoading,
  onCancel,
}: IssueGiftCardFormProps) {
  const [amountDollars, setAmountDollars] = useState("");
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<IssueGiftCardFormInput>({
    resolver: zodResolver(IssueGiftCardFormSchema),
    defaultValues: {
      code: "",
      amount: 0,
      recipientEmail: "",
      expiresAt: "",
      purchaserId: "",
    },
  });

  const codeValue = watch("code");

  const handleGenerateCode = () => {
    const code = generateGiftCardCode();
    setValue("code", code, { shouldValidate: true, shouldDirty: true });
  };

  const handleDollarsChange = (raw: string) => {
    setAmountDollars(raw);
    const num = Number(raw);
    if (Number.isFinite(num) && num >= 0) {
      setValue("amount", Math.round(num * 100), { shouldValidate: true });
    } else {
      setValue("amount", 0, { shouldValidate: true });
    }
  };

  const submit = handleSubmit(async (values) => {
    const payload: CreateGiftCardData = {
      code: values.code,
      amount: values.amount,
      recipientEmail:
        values.recipientEmail && values.recipientEmail.trim() !== ""
          ? values.recipientEmail
          : null,
      expiresAt:
        values.expiresAt && values.expiresAt.trim() !== ""
          ? new Date(values.expiresAt).toISOString()
          : null,
      purchaserId:
        values.purchaserId && values.purchaserId.trim() !== ""
          ? values.purchaserId
          : null,
    };
    await onSubmit(payload);
  });

  const busy = isLoading || isSubmitting;

  return (
    <form onSubmit={submit} noValidate className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="gc-code">Code</Label>
        <div className="flex gap-2">
          <Input
            id="gc-code"
            type="text"
            autoComplete="off"
            placeholder="e.g. ABCD-EFGH-JKLM-NPQR"
            aria-invalid={errors.code ? true : undefined}
            aria-describedby={errors.code ? "gc-code-error" : undefined}
            {...register("code")}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleGenerateCode}
            className="shrink-0 gap-1"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Generate
          </Button>
        </div>
        {!errors.code && codeValue && (
          <p className="text-xs text-muted-foreground">
            A-Z, 0-9, and hyphens only. Uppercased on submit.
          </p>
        )}
        {errors.code && (
          <p
            id="gc-code-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {errors.code.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="gc-amount">Amount</Label>
        <Input
          id="gc-amount"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="50.00"
          value={amountDollars}
          onChange={(e) => handleDollarsChange(e.target.value)}
          aria-invalid={errors.amount ? true : undefined}
          aria-describedby="gc-amount-help gc-amount-error"
        />
        <p id="gc-amount-help" className="text-xs text-muted-foreground">
          Stored in cents. Enter the customer-facing amount in your currency.
        </p>
        {errors.amount && (
          <p
            id="gc-amount-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {errors.amount.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="gc-email">Recipient email (optional)</Label>
        <Input
          id="gc-email"
          type="email"
          autoComplete="email"
          placeholder="recipient@example.com"
          aria-invalid={errors.recipientEmail ? true : undefined}
          aria-describedby={
            errors.recipientEmail ? "gc-email-error" : undefined
          }
          {...register("recipientEmail")}
        />
        {errors.recipientEmail && (
          <p
            id="gc-email-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {errors.recipientEmail.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="gc-expires">Expires at (optional)</Label>
        <Input
          id="gc-expires"
          type="date"
          aria-invalid={errors.expiresAt ? true : undefined}
          aria-describedby={
            errors.expiresAt ? "gc-expires-error" : "gc-expires-help"
          }
          {...register("expiresAt")}
        />
        <p id="gc-expires-help" className="text-xs text-muted-foreground">
          Leave blank for no expiry.
        </p>
        {errors.expiresAt && (
          <p
            id="gc-expires-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {errors.expiresAt.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="gc-purchaser">Purchaser ID (optional)</Label>
        <Input
          id="gc-purchaser"
          type="text"
          autoComplete="off"
          placeholder="UUID of the purchasing user"
          aria-invalid={errors.purchaserId ? true : undefined}
          aria-describedby={
            errors.purchaserId ? "gc-purchaser-error" : undefined
          }
          {...register("purchaserId")}
        />
        {errors.purchaserId && (
          <p
            id="gc-purchaser-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {errors.purchaserId.message}
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={busy} aria-busy={busy}>
          {busy ? "Issuing…" : "Issue gift card"}
        </Button>
      </div>
    </form>
  );
}
