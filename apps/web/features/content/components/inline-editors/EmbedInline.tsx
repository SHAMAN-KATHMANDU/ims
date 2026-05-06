"use client";

import type { EmbedProps } from "@repo/shared";
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

const ASPECTS: NonNullable<EmbedProps["aspectRatio"]>[] = [
  "16/9",
  "4/3",
  "1/1",
  "auto",
];

export function EmbedInline({
  props,
  onChange,
  disabled,
}: InlineEditorProps<EmbedProps>) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Embed URL</Label>
        <Input
          value={props.src ?? ""}
          onChange={(e) => onChange({ ...props, src: e.target.value })}
          placeholder="https://www.youtube.com/embed/…"
          disabled={disabled}
          aria-label="Embed URL"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Title</Label>
          <Input
            value={props.title ?? ""}
            onChange={(e) =>
              onChange({ ...props, title: e.target.value || undefined })
            }
            placeholder="Optional"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Aspect</Label>
          <Select
            value={props.aspectRatio ?? "16/9"}
            onValueChange={(v) =>
              onChange({
                ...props,
                aspectRatio: v as EmbedProps["aspectRatio"],
              })
            }
            disabled={disabled}
          >
            <SelectTrigger aria-label="Embed aspect">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASPECTS.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
