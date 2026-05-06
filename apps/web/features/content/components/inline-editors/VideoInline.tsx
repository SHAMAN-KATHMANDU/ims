"use client";

import type { VideoProps } from "@repo/shared";
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

const SOURCES: VideoProps["source"][] = ["youtube", "vimeo", "mp4"];
const ASPECTS: NonNullable<VideoProps["aspectRatio"]>[] = [
  "16/9",
  "4/3",
  "1/1",
];

export function VideoInline({
  props,
  onChange,
  disabled,
}: InlineEditorProps<VideoProps>) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Source</Label>
          <Select
            value={props.source}
            onValueChange={(v) =>
              onChange({ ...props, source: v as VideoProps["source"] })
            }
            disabled={disabled}
          >
            <SelectTrigger aria-label="Video source">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Aspect</Label>
          <Select
            value={props.aspectRatio ?? "16/9"}
            onValueChange={(v) =>
              onChange({
                ...props,
                aspectRatio: v as VideoProps["aspectRatio"],
              })
            }
            disabled={disabled}
          >
            <SelectTrigger aria-label="Video aspect">
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
        <Label className="text-xs text-muted-foreground">URL</Label>
        <Input
          value={props.url ?? ""}
          onChange={(e) => onChange({ ...props, url: e.target.value })}
          placeholder="https://… (YouTube ID, Vimeo URL, or .mp4 path)"
          disabled={disabled}
          aria-label="Video URL"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Caption</Label>
        <Input
          value={props.caption ?? ""}
          onChange={(e) =>
            onChange({ ...props, caption: e.target.value || undefined })
          }
          placeholder="Optional"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
