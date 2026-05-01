/**
 * Shared PDP column builder — used by all templates for gallery + buybox.
 *
 * Each template's PDP factory calls this to build the gallery/buybox pair,
 * customizing gallery layout, aspect ratio, and buybox options.
 */

import type { BlockNode, BlockPropsMap } from "@repo/shared";
import { block } from "./factories";

/**
 * Build a two-column PDP scaffold: gallery on the left, buybox on the right
 * (stacks on mobile).
 *
 * Params:
 *   galleryLayout — "thumbs-below", "thumbs-left", or "stacked"
 *   opts.enableZoom — gallery zoom control (default: true)
 *   opts.galleryAspect — aspect ratio like "4/5" (optional)
 *   opts.buybox — buybox prop overrides (optional)
 *   opts.stickyFirst — sticky gallery (default: true)
 */
export function pdpColumns(
  galleryLayout: BlockPropsMap["pdp-gallery"]["layout"] = "thumbs-below",
  opts: {
    enableZoom?: boolean;
    galleryAspect?: BlockPropsMap["pdp-gallery"]["aspectRatio"];
    buybox?: BlockPropsMap["pdp-buybox"];
    stickyFirst?: boolean;
  } = {},
): BlockNode {
  const galleryProps: BlockPropsMap["pdp-gallery"] = {
    layout: galleryLayout,
    enableZoom: opts.enableZoom ?? true,
    ...(opts.galleryAspect ? { aspectRatio: opts.galleryAspect } : {}),
  };
  const buyboxProps: BlockPropsMap["pdp-buybox"] = {
    showSku: true,
    showCategory: true,
    ...opts.buybox,
  };
  return {
    ...block("columns", {
      count: 2,
      gap: "lg",
      verticalAlign: "start",
      stackBelow: "lg",
      stickyFirst: opts.stickyFirst ?? true,
    }),
    children: [
      block("pdp-gallery", galleryProps),
      block("pdp-buybox", buyboxProps),
    ],
  };
}
