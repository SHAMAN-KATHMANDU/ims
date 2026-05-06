"use client";

import type { SpacerProps } from "@repo/shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { InlineEditorProps } from "./types";

const SIZES: SpacerProps["size"][] = ["xs", "sm", "md", "lg", "xl"];

export function SpacerInline({
  props,
  onChange,
  disabled,
}: InlineEditorProps<SpacerProps>) {
  return (
    <div className="flex items-end gap-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Size</Label>
        <Select
          value={props.size}
          onValueChange={(v) =>
            onChange({ ...props, size: v as SpacerProps["size"] })
          }
          disabled={disabled}
        >
          <SelectTrigger className="w-28" aria-label="Spacer size">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SIZES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
