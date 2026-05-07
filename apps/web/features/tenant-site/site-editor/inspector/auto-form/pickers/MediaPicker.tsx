"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, Plus, X, AlertCircle } from "lucide-react";

interface MediaPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  helpText?: string;
}

export function MediaPicker({
  value,
  onChange,
  label,
  helpText,
}: MediaPickerProps) {
  const hasAltText = !!value && value.includes("|");

  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">{label}</Label>
          {helpText && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info size={14} className="text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>{helpText}</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
      <div className="space-y-2">
        {/* URL input */}
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="text-sm flex-1"
          />
          <Button size="sm" variant="outline" className="shrink-0">
            <Plus size={16} className="mr-1" /> Browse
          </Button>
          {value && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onChange("")}
              className="h-8 w-8 p-0"
            >
              <X size={16} />
            </Button>
          )}
        </div>

        {/* Alt text warning (if empty) */}
        {value && !hasAltText && (
          <div className="rounded border border-yellow-200 bg-yellow-50 p-2 flex items-start gap-2">
            <AlertCircle
              size={14}
              className="text-yellow-700 mt-0.5 shrink-0"
            />
            <div className="flex-1">
              <p className="text-xs text-yellow-900 font-medium">
                Alt text required (a11y)
              </p>
              <p className="text-xs text-yellow-800 mt-0.5">
                Add a descriptive alt text for accessibility
              </p>
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Media library coming in Phase 4 — paste URL above
      </p>
    </div>
  );
}
