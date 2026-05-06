"use client";

import type { RichTextProps } from "@repo/shared";
import { Textarea } from "@/components/ui/textarea";
import type { InlineEditorProps } from "./types";

/**
 * Rich-text inline editor — a plain markdown textarea for v1.
 * Phase 3b will swap the textarea for a TipTap-backed inline editor.
 * The schema accepts markdown today, so author-facing behavior stays
 * the same regardless of the editor implementation.
 */
export function RichTextInline({
  props,
  onChange,
  disabled,
}: InlineEditorProps<RichTextProps>) {
  return (
    <Textarea
      value={props.source ?? ""}
      onChange={(e) => onChange({ ...props, source: e.target.value })}
      placeholder="Write in markdown… (# heading, **bold**, [link](url))"
      disabled={disabled}
      aria-label="Rich text content (markdown)"
      rows={6}
      className="font-mono text-sm"
    />
  );
}
