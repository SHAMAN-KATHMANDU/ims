"use client";

import { type ReactNode, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<V extends string> {
  value: V;
  label: ReactNode;
  /** Optional tone — drives the active colour ring. */
  tone?: "default" | "success" | "danger";
  disabled?: boolean;
}

export interface SegmentedControlProps<V extends string> extends Omit<
  ButtonHTMLAttributes<HTMLDivElement>,
  "onChange"
> {
  value: V;
  onChange: (value: V) => void;
  options: readonly SegmentedOption<V>[];
  size?: "sm" | "md";
  "aria-label"?: string;
}

const toneStyles: Record<
  NonNullable<SegmentedOption<string>["tone"]>,
  string
> = {
  default: "data-[active=true]:bg-background data-[active=true]:shadow-sm",
  success:
    "data-[active=true]:bg-emerald-500/15 data-[active=true]:text-emerald-700 dark:data-[active=true]:text-emerald-400 data-[active=true]:ring-1 data-[active=true]:ring-emerald-500/30",
  danger:
    "data-[active=true]:bg-rose-500/15 data-[active=true]:text-rose-700 dark:data-[active=true]:text-rose-400 data-[active=true]:ring-1 data-[active=true]:ring-rose-500/30",
};

/**
 * Accessible 3-state (or n-state) segmented control built on native buttons
 * inside a radio-group container. Used for the Allow/Inherit/Deny overwrite
 * selector but generic enough for any small choice group.
 */
export function SegmentedControl<V extends string>({
  value,
  onChange,
  options,
  size = "md",
  className,
  ...rest
}: SegmentedControlProps<V>) {
  const height = size === "sm" ? "h-8" : "h-9";
  return (
    <div
      role="radiogroup"
      className={cn(
        "inline-flex items-center gap-1 rounded-md border bg-muted/50 p-1",
        className,
      )}
      {...rest}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        const tone = opt.tone ?? "default";
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={opt.disabled}
            data-active={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              height,
              "inline-flex min-w-[4.5rem] items-center justify-center gap-1 rounded px-3 text-sm font-medium transition-colors",
              "text-muted-foreground hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
              toneStyles[tone],
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
