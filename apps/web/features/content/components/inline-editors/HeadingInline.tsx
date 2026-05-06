"use client";

import type { HeadingProps } from "@repo/shared";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { InlineEditorProps } from "./types";

const LEVELS: HeadingProps["level"][] = [1, 2, 3, 4];

export function HeadingInline({
  props,
  onChange,
  disabled,
}: InlineEditorProps<HeadingProps>) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Select
          value={String(props.level)}
          onValueChange={(v) =>
            onChange({ ...props, level: Number(v) as HeadingProps["level"] })
          }
          disabled={disabled}
        >
          <SelectTrigger className="w-24" aria-label="Heading level">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LEVELS.map((l) => (
              <SelectItem key={l} value={String(l)}>
                H{l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={props.text ?? ""}
          onChange={(e) => onChange({ ...props, text: e.target.value })}
          placeholder="Heading text…"
          disabled={disabled}
          aria-label="Heading text"
          className="flex-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Eyebrow</Label>
          <Input
            value={props.eyebrow ?? ""}
            onChange={(e) =>
              onChange({ ...props, eyebrow: e.target.value || undefined })
            }
            placeholder="Optional small label above"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Subtitle</Label>
          <Input
            value={props.subtitle ?? ""}
            onChange={(e) =>
              onChange({ ...props, subtitle: e.target.value || undefined })
            }
            placeholder="Optional supporting line"
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
