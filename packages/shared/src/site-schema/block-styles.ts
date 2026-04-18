/**
 * BlockStyleSchema — universal style override attachable to every BlockNode.
 *
 * Each block in the site-schema owns its layout/content props, but visual
 * polish (spacing, borders, backgrounds, shadows, alignment) is modeled
 * once here so editor UIs, renderers and templates only need one vocabulary.
 *
 * The renderer consumes these via `applyBlockStyles()` in tenant-site,
 * which translates enum tokens → CSS. Values are enum tokens (not raw
 * px/rem) so every tenant theme maps them consistently via CSS variables.
 *
 * Every field is optional. `DEFAULT_BLOCK_STYLE` documents what the
 * renderer falls back to when a field is missing — absent fields must
 * produce zero styling overhead so legacy block trees keep rendering
 * untouched.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SpacingScale = "none" | "compact" | "balanced" | "spacious";
export type MarginScale = "none" | "sm" | "md" | "lg";
export type MaxWidthScale = "narrow" | "default" | "wide" | "full";
export type RadiusScale = "none" | "sm" | "md" | "lg" | "full";
export type ShadowScale = "none" | "sm" | "md" | "lg";
export type BorderToneScale = "subtle" | "strong" | "accent";
export type MinHeightScale = "auto" | "sm" | "md" | "lg" | "screen";
export type Alignment = "start" | "center" | "end";
export type OverlayScale = "none" | "light" | "dark" | "brand";

/**
 * Universal style override. Attach to any BlockNode via `node.style`.
 * Fields are orthogonal — a tenant can set just `shadow` without
 * implying anything else.
 */
export interface BlockStyle {
  // Spacing
  paddingY?: SpacingScale;
  paddingX?: SpacingScale;
  marginY?: MarginScale;

  // Background
  backgroundToken?: string;
  backgroundImage?: string;
  backgroundOverlay?: OverlayScale;

  // Text
  textToken?: string;
  alignment?: Alignment;

  // Border / surface
  borderWidth?: 0 | 1 | 2 | 4;
  borderTone?: BorderToneScale;
  borderRadius?: RadiusScale;
  shadow?: ShadowScale;

  // Layout envelope
  maxWidth?: MaxWidthScale;
  minHeight?: MinHeightScale;
}

/**
 * Back-compat alias. The node-level style field was originally named
 * `BlockStyleOverride`; keep the name exported so existing imports in
 * the tenant-site renderer + web editor continue to resolve.
 */
export type BlockStyleOverride = BlockStyle;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/**
 * Default visual contract every block renders against when `node.style`
 * is absent or only partially set. Keep this minimal — the renderer
 * treats these as "do nothing special" fallbacks, not as opinionated
 * styling. Changing a default here is a platform-wide visual change.
 */
export const DEFAULT_BLOCK_STYLE = {
  paddingY: "balanced",
  paddingX: "none",
  marginY: "none",
  backgroundOverlay: "none",
  alignment: "start",
  borderWidth: 0,
  borderTone: "subtle",
  borderRadius: "none",
  shadow: "none",
  maxWidth: "default",
  minHeight: "auto",
} as const satisfies Required<
  Pick<
    BlockStyle,
    | "paddingY"
    | "paddingX"
    | "marginY"
    | "backgroundOverlay"
    | "alignment"
    | "borderWidth"
    | "borderTone"
    | "borderRadius"
    | "shadow"
    | "maxWidth"
    | "minHeight"
  >
>;

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

export const BlockStyleSchema: z.ZodType<BlockStyle> = z
  .object({
    paddingY: z.enum(["none", "compact", "balanced", "spacious"]).optional(),
    paddingX: z.enum(["none", "compact", "balanced", "spacious"]).optional(),
    marginY: z.enum(["none", "sm", "md", "lg"]).optional(),
    backgroundToken: z.string().trim().max(80).optional(),
    backgroundImage: z.string().trim().max(1000).optional(),
    backgroundOverlay: z.enum(["none", "light", "dark", "brand"]).optional(),
    textToken: z.string().trim().max(80).optional(),
    alignment: z.enum(["start", "center", "end"]).optional(),
    borderWidth: z
      .union([z.literal(0), z.literal(1), z.literal(2), z.literal(4)])
      .optional(),
    borderTone: z.enum(["subtle", "strong", "accent"]).optional(),
    borderRadius: z.enum(["none", "sm", "md", "lg", "full"]).optional(),
    shadow: z.enum(["none", "sm", "md", "lg"]).optional(),
    maxWidth: z.enum(["narrow", "default", "wide", "full"]).optional(),
    minHeight: z.enum(["auto", "sm", "md", "lg", "screen"]).optional(),
  })
  .strict();

/** Back-compat alias for legacy imports. */
export const BlockStyleOverrideSchema = BlockStyleSchema;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Merge a partial override on top of DEFAULT_BLOCK_STYLE. Undefined
 * fields in the override fall through to the default. Use this in
 * editor previews or anywhere you need a fully-resolved style.
 */
export type ResolvedBlockStyle = BlockStyle &
  Pick<
    Required<BlockStyle>,
    | "paddingY"
    | "paddingX"
    | "marginY"
    | "backgroundOverlay"
    | "alignment"
    | "borderWidth"
    | "borderTone"
    | "borderRadius"
    | "shadow"
    | "maxWidth"
    | "minHeight"
  >;

export function resolveBlockStyle(
  override: BlockStyle | undefined,
): ResolvedBlockStyle {
  return { ...DEFAULT_BLOCK_STYLE, ...(override ?? {}) };
}
