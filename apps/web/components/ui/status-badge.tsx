"use client";

import type { ComponentProps, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BadgeBaseProps = Omit<
  ComponentProps<typeof Badge>,
  "variant" | "children"
>;

export interface StatusBadgeProps extends BadgeBaseProps {
  variant?: "success" | "warning" | "info" | "danger" | "muted";
  children: ReactNode;
}

const variantStyles: Record<
  Exclude<StatusBadgeProps["variant"], undefined>,
  string
> = {
  success:
    "border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300",
  warning:
    "border-transparent bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300",
  info: "border-transparent bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300",
  danger:
    "border-transparent bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300",
  muted: "border-transparent bg-muted text-muted-foreground",
};

export function StatusBadge({
  variant = "muted",
  className,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(variantStyles[variant], className)}
      {...props}
    >
      {children}
    </Badge>
  );
}
