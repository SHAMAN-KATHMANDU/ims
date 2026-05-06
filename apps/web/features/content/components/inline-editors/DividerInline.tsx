"use client";

import type { DividerProps } from "@repo/shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { InlineEditorProps } from "./types";

const VARIANTS: NonNullable<DividerProps["variant"]>[] = [
  "line",
  "dotted",
  "dashed",
];

export function DividerInline({
  props,
  onChange,
  disabled,
}: InlineEditorProps<DividerProps>) {
  return (
    <div className="flex items-end gap-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Style</Label>
        <Select
          value={props.variant ?? "line"}
          onValueChange={(v) =>
            onChange({ ...props, variant: v as DividerProps["variant"] })
          }
          disabled={disabled}
        >
          <SelectTrigger className="w-32" aria-label="Divider style">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VARIANTS.map((v) => (
              <SelectItem key={v} value={v}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
