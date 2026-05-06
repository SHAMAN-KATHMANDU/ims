"use client";

import type { MarkdownBodyProps } from "@repo/shared";
import { Textarea } from "@/components/ui/textarea";
import type { InlineEditorProps } from "./types";

/**
 * Markdown-body inline editor — like rich-text but accepts up to 200K
 * chars (legacy bulk markdown body). Used as the fallback when an
 * existing markdown post is migrated to a block tree in one piece.
 */
export function MarkdownBodyInline({
  props,
  onChange,
  disabled,
}: InlineEditorProps<MarkdownBodyProps>) {
  return (
    <Textarea
      value={props.source ?? ""}
      onChange={(e) => onChange({ ...props, source: e.target.value })}
      placeholder="Markdown body…"
      disabled={disabled}
      aria-label="Markdown body"
      rows={10}
      className="font-mono text-sm"
    />
  );
}
