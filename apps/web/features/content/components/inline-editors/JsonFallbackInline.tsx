"use client";

import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import type { InlineEditorProps } from "./types";

/**
 * Fallback inline editor for kinds without a dedicated UI yet (gallery,
 * accordion, faq, testimonials, tabs, story-split, newsletter,
 * contact-block, …). Renders the props as JSON in a textarea; on every
 * change, parses + propagates if the JSON is valid; otherwise leaves the
 * model untouched and surfaces a parse error inline.
 *
 * Authors who frequently edit one of these kinds can request a dedicated
 * inline editor — adding one is a small file under `inline-editors/` plus
 * a switch case in `pickInlineEditor.ts`.
 */
export function JsonFallbackInline<P>({
  props,
  onChange,
  disabled,
}: InlineEditorProps<P>) {
  // Keep the textarea state local so partial / mid-keystroke JSON doesn't
  // wipe the model. Sync from props only when the incoming value changes
  // (e.g. via undo).
  const initial = JSON.stringify(props ?? {}, null, 2);
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(JSON.stringify(props ?? {}, null, 2));
    setError(null);
  }, [props]);

  return (
    <div className="space-y-1">
      <Textarea
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          try {
            const parsed = JSON.parse(next) as P;
            setError(null);
            onChange(parsed);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Invalid JSON");
          }
        }}
        disabled={disabled}
        rows={8}
        className="font-mono text-xs"
        aria-label="Block props (JSON)"
      />
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        No purpose-built editor for this block kind yet — edit the JSON
        directly. Use the site builder for richer editing of this kind.
      </p>
    </div>
  );
}
