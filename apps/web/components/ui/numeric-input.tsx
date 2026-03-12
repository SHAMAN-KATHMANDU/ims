"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface NumericInputProps
  extends Omit<
    React.ComponentProps<typeof Input>,
    "type" | "value" | "onChange" | "inputMode"
  > {
  value: string;
  onChange: (value: string) => void;
  /** Allow decimal point. Default true. */
  allowDecimals?: boolean;
  /** Min value (optional). */
  min?: number;
  /** Max value (optional). */
  max?: number;
  /** Show inline error on blur when invalid. */
  error?: string | null;
}

function stripNonNumeric(
  raw: string,
  allowDecimals: boolean,
): string {
  if (allowDecimals) {
    const parts = raw.split(".");
    if (parts.length > 2) return (parts[0] ?? "") + "." + parts.slice(1).join("");
    if (parts.length === 2) {
      return (parts[0] ?? "").replace(/\D/g, "") + "." + (parts[1] ?? "").replace(/\D/g, "");
    }
    return (parts[0] ?? "").replace(/\D/g, "");
  }
  return raw.replace(/\D/g, "");
}

export function NumericInput({
  value,
  onChange,
  onBlur,
  allowDecimals = true,
  min,
  max,
  error,
  className,
  ...props
}: NumericInputProps) {
  const [blurError, setBlurError] = React.useState<string | null>(null);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const stripped = stripNonNumeric(raw, allowDecimals);
    onChange(stripped);
    setBlurError(null);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    onBlur?.(e);
    const raw = value.trim();
    if (!raw) {
      setBlurError(null);
      return;
    }
    const num = allowDecimals ? parseFloat(raw) : parseInt(raw, 10);
    if (isNaN(num)) {
      setBlurError("Please enter a valid number");
      return;
    }
    if (min !== undefined && num < min) {
      setBlurError(`Must be at least ${min}`);
      return;
    }
    if (max !== undefined && num > max) {
      setBlurError(`Must be at most ${max}`);
      return;
    }
    setBlurError(null);
  };

  const showError = error ?? blurError;

  return (
    <div className="space-y-1">
      <Input
        {...props}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={handleInput}
        onBlur={handleBlur}
        className={cn(showError && "border-destructive", className)}
        aria-invalid={!!showError}
      />
      {showError && (
        <p className="text-sm text-destructive" role="alert">
          {showError}
        </p>
      )}
    </div>
  );
}
