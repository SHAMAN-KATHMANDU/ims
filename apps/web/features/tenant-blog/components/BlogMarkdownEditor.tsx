"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

/**
 * Split-pane markdown editor. Left: textarea. Right: live preview rendered
 * with the same react-markdown stack the tenant-site renderer uses, so WYSIWYG
 * stays honest — anything that shows up in the preview will show up live.
 *
 * Toolbar is intentionally thin: a few buttons for the common formatting
 * operations. Full WYSIWYG rich-text comes later (Phase B with TipTap).
 */
export function BlogMarkdownEditor({
  value,
  onChange,
  id = "blog-body-markdown",
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  id?: string;
  disabled?: boolean;
}) {
  const insert = (before: string, after = "") => {
    const el = document.getElementById(id) as HTMLTextAreaElement | null;
    if (!el) {
      onChange(`${value}${before}${after}`);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    onChange(next);
    // Restore focus after state flush.
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + before.length + selected.length + after.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const wordCount = useMemo(
    () => value.trim().split(/\s+/).filter(Boolean).length,
    [value],
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => insert("**", "**")}
          disabled={disabled}
        >
          B
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => insert("_", "_")}
          disabled={disabled}
        >
          I
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => insert("## ")}
          disabled={disabled}
        >
          H2
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => insert("### ")}
          disabled={disabled}
        >
          H3
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => insert("- ")}
          disabled={disabled}
        >
          •
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => insert("[", "](https://)")}
          disabled={disabled}
        >
          Link
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => insert("> ")}
          disabled={disabled}
        >
          Quote
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => insert("`", "`")}
          disabled={disabled}
        >
          Code
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={18}
          className="font-mono text-sm"
          placeholder="Write your post in markdown…"
        />

        <div className="min-h-[18rem] rounded-md border border-border bg-background p-4 text-sm overflow-auto">
          {value.trim() ? (
            <div className="blog-prose prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize]}
              >
                {value}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Preview will appear here as you type.
            </p>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {wordCount} word{wordCount === 1 ? "" : "s"} ·{" "}
        {Math.max(1, Math.ceil(wordCount / 200))} min read
      </p>
    </div>
  );
}
