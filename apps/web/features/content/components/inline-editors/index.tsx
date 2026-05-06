"use client";

/**
 * Inline-editor registry — maps each content body block kind to the
 * inline editor that renders inside its row in `ContentBlockEditor`.
 *
 * Kinds without a dedicated entry fall through to `JsonFallbackInline`,
 * which lets authors edit the raw JSON props. Adding a new dedicated
 * editor: add the file under this folder, then add a case here.
 */

import type { ComponentType } from "react";
import type { BlockKind } from "@repo/shared";

import { HeadingInline } from "./HeadingInline";
import { RichTextInline } from "./RichTextInline";
import { MarkdownBodyInline } from "./MarkdownBodyInline";
import { ImageInline } from "./ImageInline";
import { DividerInline } from "./DividerInline";
import { SpacerInline } from "./SpacerInline";
import { ButtonInline } from "./ButtonInline";
import { EmbedInline } from "./EmbedInline";
import { VideoInline } from "./VideoInline";
import { CustomHtmlInline } from "./CustomHtmlInline";
import { SnippetRefInline } from "./SnippetRefInline";
import { JsonFallbackInline } from "./JsonFallbackInline";
import type { InlineEditorProps } from "./types";

type InlineEditorComponent = ComponentType<InlineEditorProps<unknown>>;

const INLINE_EDITORS: Partial<Record<BlockKind, InlineEditorComponent>> = {
  heading: HeadingInline as InlineEditorComponent,
  "rich-text": RichTextInline as InlineEditorComponent,
  "markdown-body": MarkdownBodyInline as InlineEditorComponent,
  image: ImageInline as InlineEditorComponent,
  divider: DividerInline as InlineEditorComponent,
  spacer: SpacerInline as InlineEditorComponent,
  button: ButtonInline as InlineEditorComponent,
  embed: EmbedInline as InlineEditorComponent,
  video: VideoInline as InlineEditorComponent,
  "custom-html": CustomHtmlInline as InlineEditorComponent,
  "snippet-ref": SnippetRefInline as InlineEditorComponent,
};

/**
 * Pick the inline editor for a block kind, falling back to the JSON
 * editor when no dedicated component exists.
 */
export function pickInlineEditor(kind: BlockKind): InlineEditorComponent {
  return INLINE_EDITORS[kind] ?? (JsonFallbackInline as InlineEditorComponent);
}

export type { InlineEditorProps } from "./types";
