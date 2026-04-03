"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/useMobile";
import { cn } from "@/lib/utils";

interface ResponsiveDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Tailwind max-w suffix — e.g. "xl", "2xl", "3xl". Defaults to "2xl". */
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  /** Applies default content spacing for drawer bodies. */
  bodyPadding?: boolean;
  /** Additional classes for the scrollable body container. */
  bodyClassName?: string;
  children: React.ReactNode;
}

const sizeMap: Record<NonNullable<ResponsiveDrawerProps["size"]>, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
  "3xl": "sm:max-w-3xl",
};

export function ResponsiveDrawer({
  open,
  onOpenChange,
  title,
  description,
  size = "2xl",
  bodyPadding = true,
  bodyClassName,
  children,
}: ResponsiveDrawerProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="flex max-h-[90vh] flex-col gap-0 rounded-t-2xl p-0"
          allowDismiss={false}
        >
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted-foreground/20 shrink-0" />
          <SheetHeader className="px-6 py-4 border-b shrink-0">
            <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
            {description && (
              <SheetDescription className="text-sm text-muted-foreground">
                {description}
              </SheetDescription>
            )}
          </SheetHeader>
          <div
            className={cn(
              "flex-1 min-h-0 overflow-y-auto overscroll-contain",
              bodyPadding && "px-6 py-4",
              bodyClassName,
            )}
          >
            {children}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={`flex h-full max-h-dvh w-full flex-col gap-0 p-0 ${sizeMap[size]}`}
        allowDismiss={false}
      >
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
          {description && (
            <SheetDescription className="text-sm text-muted-foreground">
              {description}
            </SheetDescription>
          )}
        </SheetHeader>
        <div
          className={cn(
            "flex-1 min-h-0 overflow-y-auto overscroll-contain",
            bodyPadding && "px-6 py-4",
            bodyClassName,
          )}
        >
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
