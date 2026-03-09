"use client";

import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ChartInfoButtonProps {
  /** Short explanation of what the chart shows. Shown in a popover when the user clicks the info icon. */
  content: string;
}

/**
 * Info icon button for report charts. Click to open a popover explaining what the chart shows.
 */
export function ChartInfoButton({ content }: ChartInfoButtonProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
          aria-label="What does this chart show?"
        >
          <Info className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-w-sm text-sm">
        {content}
      </PopoverContent>
    </Popover>
  );
}
