/**
 * image-fields — heuristic for "this string field holds an image URL".
 *
 * BlockInspector consults this when deciding whether to render a plain
 * <Input> or the rich <MediaPickerField> for a string field. The rule is
 * conservative on purpose:
 *
 *   - Names that *always* mean an image URL match unconditionally
 *     (e.g. `imageUrl`, `logoUrl`, `backgroundImage`, `faviconUrl`).
 *
 *   - Ambiguous names like `src` (also used by the `embed` and `video`
 *     blocks for non-image URLs) must be qualified by either:
 *       (a) the block kind being a known image block, or
 *       (b) the parent field name being an array of image objects
 *           (`logos`, `images`, `slides`).
 *
 * Centralising the rule here keeps the inspector body readable and gives us
 * one place to grow the allow-list as new image-shaped blocks land.
 */

/** Field names that *always* carry an image URL, regardless of block kind. */
const ALWAYS_IMAGE_FIELDS = new Set<string>([
  "imageUrl",
  "logoUrl",
  "logoSrc",
  "faviconUrl",
  "backgroundImage",
  "posterImage",
  "bgImage",
  "imageSrc",
  "thumbnailUrl",
  "coverImage",
  "heroImage",
  "videoPoster",
]);

/** Block kinds whose top-level `src` prop is an image URL. */
const IMAGE_SRC_BLOCK_KINDS = new Set<string>(["image", "logo-mark"]);

/** Parent array prop names whose `src` sub-field is an image URL. */
const IMAGE_SRC_PARENT_FIELDS = new Set<string>([
  "logos",
  "images",
  "slides",
  "gallery",
  "items", // logo-cloud + lookbook commonly use this
]);

/**
 * Returns true when `fieldName` (optionally inside `parentField`, optionally
 * on `blockKind`) should render as an image picker rather than a plain input.
 */
export function isImageFieldName(
  fieldName: string,
  ctx: { blockKind?: string; parentField?: string } = {},
): boolean {
  if (ALWAYS_IMAGE_FIELDS.has(fieldName)) return true;
  if (fieldName === "src") {
    if (ctx.blockKind && IMAGE_SRC_BLOCK_KINDS.has(ctx.blockKind)) return true;
    if (ctx.parentField && IMAGE_SRC_PARENT_FIELDS.has(ctx.parentField))
      return true;
  }
  return false;
}
