"use client";

import type { CustomHtmlProps } from "@repo/shared";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { InlineEditorProps } from "./types";

export function CustomHtmlInline({
  props,
  onChange,
  disabled,
}: InlineEditorProps<CustomHtmlProps>) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">HTML</Label>
        <Textarea
          value={props.html ?? ""}
          onChange={(e) => onChange({ ...props, html: e.target.value })}
          placeholder="<div>…</div>"
          disabled={disabled}
          aria-label="Custom HTML"
          rows={8}
          className="font-mono text-xs"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">CSS (optional)</Label>
        <Textarea
          value={props.css ?? ""}
          onChange={(e) =>
            onChange({ ...props, css: e.target.value || undefined })
          }
          placeholder=".my-class { color: red; }"
          disabled={disabled}
          aria-label="Custom CSS"
          rows={4}
          className="font-mono text-xs"
        />
      </div>
    </div>
  );
}
