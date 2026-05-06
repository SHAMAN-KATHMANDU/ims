"use client";

import type { ButtonProps } from "@repo/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InlineEditorProps } from "./types";

const STYLES: ButtonProps["style"][] = ["primary", "outline", "ghost"];

export function ButtonInline({
  props,
  onChange,
  disabled,
}: InlineEditorProps<ButtonProps>) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Label</Label>
          <Input
            value={props.label ?? ""}
            onChange={(e) => onChange({ ...props, label: e.target.value })}
            placeholder="Shop now"
            disabled={disabled}
            aria-label="Button label"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">URL</Label>
          <Input
            value={props.href ?? ""}
            onChange={(e) => onChange({ ...props, href: e.target.value })}
            placeholder="/products or https://…"
            disabled={disabled}
            aria-label="Button URL"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Style</Label>
        <Select
          value={props.style ?? "primary"}
          onValueChange={(v) =>
            onChange({ ...props, style: v as ButtonProps["style"] })
          }
          disabled={disabled}
        >
          <SelectTrigger className="w-32" aria-label="Button style">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STYLES.map((s) => (
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
