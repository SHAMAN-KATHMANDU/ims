/**
 * Shared PDP column builder — used by all templates for gallery + buybox.
 *
 * Each template's PDP factory calls this to build the gallery/buybox pair,
 * customizing gallery layout, aspect ratio, and buybox options.
 *
 * Supports an optional `priceTiersBefore` slot for B2B/wholesale templates
 * that want a volume-pricing table directly above the buybox CTA.
 */

import type { BlockNode, BlockPropsMap } from "@repo/shared";
import { block } from "./factories";

export interface PdpColumnsOptions {
  enableZoom?: boolean;
  galleryAspect?: BlockPropsMap["pdp-gallery"]["aspectRatio"];
  buybox?: BlockPropsMap["pdp-buybox"];
  stickyFirst?: boolean;
  /**
   * When set, a `price-tiers` block is inserted into the right column,
   * stacked above the buybox. Useful for wholesale / B2B templates.
   */
  priceTiersBefore?: BlockPropsMap["price-tiers"];
}

/**
 * Build a two-column PDP scaffold: gallery on the left, buybox on the right
 * (stacks on mobile).
 */
export function pdpColumns(
  galleryLayout: BlockPropsMap["pdp-gallery"]["layout"] = "thumbs-below",
  opts: PdpColumnsOptions = {},
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

  // Right column children: optional price-tiers stacked above the buybox.
  const rightChildren: BlockNode[] = [];
  if (opts.priceTiersBefore) {
    rightChildren.push(block("price-tiers", opts.priceTiersBefore));
  }
  rightChildren.push(block("pdp-buybox", buyboxProps));

  // If there's only the buybox, keep the simple shape (gallery + buybox)
  // so existing snapshot tests / migrations don't see an unnecessary wrapper.
  if (rightChildren.length === 1) {
    return {
      ...block("columns", {
        count: 2,
        gap: "lg",
        verticalAlign: "start",
        stackBelow: "lg",
        stickyFirst: opts.stickyFirst ?? true,
      }),
      children: [block("pdp-gallery", galleryProps), rightChildren[0]],
    };
  }

  // With price-tiers in play, the right column is wrapped in a section
  // so the price-tiers block stacks above the buybox.
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
      {
        ...block("section", {
          paddingY: "none",
          maxWidth: "full",
        }),
        children: rightChildren,
      },
    ],
  };
}
