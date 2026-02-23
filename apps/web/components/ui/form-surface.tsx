"use client";

import type React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface FormSurfaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inline?: boolean;
  title: string;
  description?: string;
  renderTrigger?: boolean;
  trigger?: React.ReactNode;
  drawerClassName?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

export function FormSurface({
  open,
  onOpenChange,
  inline = false,
  title,
  description,
  renderTrigger = false,
  trigger,
  drawerClassName,
  contentClassName,
  children,
}: FormSurfaceProps) {
  if (inline) {
    return <div className={cn("w-full", contentClassName)}>{children}</div>;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {renderTrigger && trigger ? (
        <SheetTrigger asChild>{trigger}</SheetTrigger>
      ) : null}
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn(
          "w-full max-w-[100vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl overflow-hidden p-0",
          drawerClassName,
        )}
      >
        <SheetHeader className="border-b px-4 py-3 md:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <SheetTitle className="text-left">{title}</SheetTitle>
              {description ? (
                <SheetDescription className="text-left">
                  {description}
                </SheetDescription>
              ) : null}
            </div>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto p-4 md:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]",
            contentClassName,
          )}
        >
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
