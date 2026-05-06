"use client";

import type { ImageProps } from "@repo/shared";
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

const ASPECTS: NonNullable<ImageProps["aspectRatio"]>[] = [
  "auto",
  "1/1",
  "4/3",
  "16/9",
  "3/4",
];

/**
 * Image inline editor — src URL + alt + aspect + caption.
 *
 * Note: we intentionally don't pull `MediaPickerField` from `features/media`
 * here because that component is a feature-internal hook (forms it owns).
 * Tenants can paste an asset URL or an https URL today; Phase 3b adds a
 * proper picker once the inline editors stabilise.
 */
export function ImageInline({
  props,
  onChange,
  disabled,
}: InlineEditorProps<ImageProps>) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Image URL</Label>
        <Input
          value={props.src ?? ""}
          onChange={(e) => onChange({ ...props, src: e.target.value })}
          placeholder="https://… or media-asset URL"
          disabled={disabled}
          aria-label="Image URL"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Alt text</Label>
          <Input
            value={props.alt ?? ""}
            onChange={(e) => onChange({ ...props, alt: e.target.value })}
            placeholder="Describe the image"
            disabled={disabled}
            aria-label="Alt text"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Aspect</Label>
          <Select
            value={props.aspectRatio ?? "auto"}
            onValueChange={(v) =>
              onChange({
                ...props,
                aspectRatio: v as ImageProps["aspectRatio"],
              })
            }
            disabled={disabled}
          >
            <SelectTrigger aria-label="Aspect ratio">
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
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Caption</Label>
        <Input
          value={props.caption ?? ""}
          onChange={(e) =>
            onChange({ ...props, caption: e.target.value || undefined })
          }
          placeholder="Optional caption"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
