"use client";

import * as React from "react";
import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface HelpTopicSheetProps {
  /** Short name for the help trigger’s `aria-label` (e.g. "Scope"). */
  topicLabel: string;
  /** Title shown in the sheet header (can match or expand `topicLabel`). */
  sheetTitle: string;
  children: React.ReactNode;
  /** Wider drawer for long FAQ content. */
  contentClassName?: string;
}

/**
 * Icon-only control that opens a right-side sheet with help / FAQ content.
 * Use next to field labels; keep long copy out of the main form layout.
 */
export function HelpTopicSheet({
  topicLabel,
  sheetTitle,
  children,
  contentClassName,
}: HelpTopicSheetProps): React.ReactElement {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
        aria-label={`Help: ${topicLabel}`}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <CircleHelp className="h-4 w-4" aria-hidden />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          allowDismiss
          className={cn(
            "w-full overflow-y-auto sm:max-w-md lg:max-w-lg",
            contentClassName,
          )}
        >
          <SheetHeader>
            <SheetTitle>{sheetTitle}</SheetTitle>
            <SheetDescription className="sr-only">
              Help and documentation for {topicLabel}.
            </SheetDescription>
          </SheetHeader>
          <div className="text-muted-foreground space-y-3 px-6 pb-6 text-sm">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
