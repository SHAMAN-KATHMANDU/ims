"use client";

/**
 * PageHeaderCustomization — Notion-style cover image + icon picker for
 * blog posts and custom pages (Phase 8).
 *
 * Two controls:
 *   - Cover: MediaPickerField rendered with a full-bleed preview. Clearing
 *     the field reverts the editor to the clean default chrome.
 *   - Icon: a plain text Input that accepts an emoji (or short string).
 *     We deliberately avoid a heavyweight emoji-picker dependency for v1
 *     — every modern OS already has an emoji picker (⌃⌘Space on macOS,
 *     Win+. on Windows). Tenants who paste an emoji or a custom short
 *     string both work.
 *
 * Used inside the Card / details section of BlogPostEditor and
 * TenantPageEditor; intentionally feature-agnostic so a single component
 * serves both.
 */

import { ImageOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MediaPickerField } from "@/features/media";

interface Props {
  coverImageUrl: string | undefined;
  icon: string | undefined;
  onCoverChange: (next: string | undefined) => void;
  onIconChange: (next: string) => void;
  /** Stable id prefix so two of these on a page don't share input ids. */
  idPrefix?: string;
}

export function PageHeaderCustomization({
  coverImageUrl,
  icon,
  onCoverChange,
  onIconChange,
  idPrefix = "page-header",
}: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={`${idPrefix}-cover`}>Cover image</Label>
          {coverImageUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onCoverChange(undefined)}
            >
              <ImageOff className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Remove
            </Button>
          )}
        </div>
        <MediaPickerField
          id={`${idPrefix}-cover`}
          value={coverImageUrl ?? ""}
          onChange={(next) => onCoverChange(next || undefined)}
          previewSize={128}
          helperText="Wide landscape (e.g. 16:5 or 16:9). Renders full-bleed above the title."
        />
      </div>

      <div className="space-y-2 max-w-sm">
        <Label htmlFor={`${idPrefix}-icon`}>Icon</Label>
        <Input
          id={`${idPrefix}-icon`}
          value={icon ?? ""}
          onChange={(e) => onIconChange(e.target.value)}
          placeholder="🌿  /  ✨  /  Hello"
          maxLength={80}
          className="text-2xl text-center w-24"
          aria-label="Page icon (emoji or short string)"
        />
        <p className="text-xs text-muted-foreground">
          Paste an emoji (⌃⌘Space on macOS, Win+. on Windows) or any short
          string. Renders before the heading on the public page.
        </p>
      </div>
    </div>
  );
}
