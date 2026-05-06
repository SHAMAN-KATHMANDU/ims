"use client";

/**
 * SnippetRefInline — picks an existing SiteSnippet to embed.
 *
 * The snippet list query lives in `features/snippets`; we hook into it
 * here via the public hook so the dropdown is always in sync with the
 * Snippets manager.
 */

import { useMemo } from "react";
import type { SnippetRefProps } from "@repo/shared";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSnippets } from "@/features/snippets";
import type { InlineEditorProps } from "./types";

export function SnippetRefInline({
  props,
  onChange,
  disabled,
}: InlineEditorProps<SnippetRefProps>) {
  const query = useSnippets({ limit: 200 });
  const items = useMemo(() => query.data?.snippets ?? [], [query.data]);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Snippet</Label>
        <Select
          value={props.snippetId || "_none"}
          onValueChange={(v) =>
            onChange({ ...props, snippetId: v === "_none" ? "" : v })
          }
          disabled={disabled || query.isLoading}
        >
          <SelectTrigger aria-label="Snippet">
            <SelectValue
              placeholder={
                query.isLoading
                  ? "Loading snippets…"
                  : items.length === 0
                    ? "No snippets yet — create one first"
                    : "Pick a snippet"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">— None —</SelectItem>
            {items.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.title}{" "}
                <span className="text-muted-foreground">/{s.slug}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">
          Fallback title (optional)
        </Label>
        <Input
          value={props.fallbackTitle ?? ""}
          onChange={(e) =>
            onChange({
              ...props,
              fallbackTitle: e.target.value || undefined,
            })
          }
          placeholder="Shown if the snippet is missing or recursion limit hit"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
