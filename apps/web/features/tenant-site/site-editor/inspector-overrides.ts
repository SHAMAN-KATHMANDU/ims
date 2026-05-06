/**
 * inspector-overrides.ts
 *
 * Per-field metadata overrides for BlockInspector.
 * Keyed by `${blockKind}.${fieldName}`.
 *
 * BlockInspector reads this map first; if an entry is found it uses:
 *   - `label`    instead of the auto-derived camelCase → "Title Case" label
 *   - `tooltip`  adds an info icon that shows the hint on hover
 *   - `helpText` shows an inline hint below the field
 *   - `group`    reserved for future visual grouping
 */

export interface FieldOverride {
  label?: string;
  tooltip?: string;
  helpText?: string;
  group?: string;
}

/** All overrides keyed by `${blockKind}.${fieldName}`. */
export const INSPECTOR_OVERRIDES: Record<string, FieldOverride> = {
  // ── Product Listing ──────────────────────────────────────────────────────
  "product-listing.cardAspectRatio": {
    label: "Card aspect ratio",
    tooltip:
      "Width:height ratio for product card images. Examples: 1/1 (square), 4/5 (portrait), 16/9 (wide).",
  },
  "product-listing.pageSize": {
    label: "Items per page",
    tooltip: "How many products to show per page before pagination kicks in.",
  },
  "product-listing.showSort": { label: "Show sort dropdown" },
  "product-listing.showPrice": { label: "Show price" },
  "product-listing.showCategory": { label: "Show category tag" },
  "product-listing.showDiscount": {
    label: "Show discount badge",
    tooltip: "Displays a % savings badge on sale items.",
  },
  "product-listing.defaultSort": { label: "Default sort order" },
  "product-listing.columns": {
    label: "Grid columns",
    tooltip: "Number of product columns on desktop viewports.",
  },
  "product-listing.categoryFilter": { label: "Show category filter" },

  // ── Hero ─────────────────────────────────────────────────────────────────
  "hero.alignment": { label: "Text alignment" },
  "hero.variant": { label: "Hero style" },
  "hero.ctaLabel": { label: "Button label" },
  "hero.ctaHref": { label: "Button URL" },
  "hero.eyebrow": {
    label: "Eyebrow text",
    helpText: "Small label shown above the main heading.",
  },

  // ── Product Grid ─────────────────────────────────────────────────────────
  "product-grid.source": {
    label: "Product source",
    tooltip:
      "featured: hand-picked by admin · newest: by date · on-sale: discounted · manual: you choose the IDs.",
  },
  "product-grid.limit": { label: "Number of products" },
  "product-grid.columns": { label: "Grid columns" },
  "product-grid.cardVariant": { label: "Card style" },
  "product-grid.heading": { label: "Section heading" },
  "product-grid.eyebrow": { label: "Eyebrow text" },

  // ── PDP Buybox ───────────────────────────────────────────────────────────
  "pdp-buybox.showSku": { label: "Show SKU" },
  "pdp-buybox.showCategory": { label: "Show category" },
  "pdp-buybox.showVariantPicker": { label: "Show variant selector" },
  "pdp-buybox.variantDisplay": {
    label: "Variant display style",
    tooltip: "chips: pill buttons (recommended) · select: compact dropdown.",
  },

  // ── Category Tiles ───────────────────────────────────────────────────────
  "category-tiles.aspectRatio": {
    label: "Tile aspect ratio",
    tooltip: "Width:height ratio for category image tiles.",
  },
  "category-tiles.columns": { label: "Tile columns" },

  // ── Blog List ────────────────────────────────────────────────────────────
  "blog-list.limit": { label: "Number of posts" },
  "blog-list.columns": { label: "Post columns" },

  // ── Bento Showcase ───────────────────────────────────────────────────────
  "bento-showcase.limit": { label: "Number of products" },
  "bento-showcase.source": { label: "Product source" },

  // ── Story Split ──────────────────────────────────────────────────────────
  "story-split.imageSide": {
    label: "Image position",
    tooltip: "Which side the image appears on (desktop).",
  },

  // ── PDP Gallery ──────────────────────────────────────────────────────────
  "pdp-gallery.layout": { label: "Gallery layout" },
  "pdp-gallery.enableZoom": { label: "Enable zoom" },

  // ── Embed ────────────────────────────────────────────────────────────────
  "embed.src": { label: "Embed URL" },
  "embed.aspectRatio": { label: "Aspect ratio" },
  "embed.allowFullscreen": { label: "Allow fullscreen" },

  // ── Video ────────────────────────────────────────────────────────────────
  "video.source": { label: "Video platform" },
  "video.url": { label: "Video URL" },
  "video.aspectRatio": { label: "Aspect ratio" },

  // ── Image ────────────────────────────────────────────────────────────────
  "image.src": { label: "Image URL" },
  "image.aspectRatio": { label: "Aspect ratio" },
  "image.rounded": { label: "Rounded corners" },

  // ── Button ───────────────────────────────────────────────────────────────
  "button.label": { label: "Button text" },
  "button.href": { label: "Link URL" },
  "button.style": { label: "Button style" },
  "button.alignment": { label: "Alignment" },

  // ── Collection Cards ─────────────────────────────────────────────────────
  "collection-cards.aspectRatio": { label: "Card aspect ratio" },
  "collection-cards.overlay": { label: "Dark overlay on image" },

  // ── FBT ─────────────────────────────────────────────────────────────────
  "fbt.productIdSource": { label: "Product source" },
  "fbt.productId": { label: "Pinned product ID" },
  "fbt.limit": { label: "Max products shown" },
  "fbt.columns": { label: "Columns" },
  "fbt.cardVariant": { label: "Card style" },

  // ── Reviews List ─────────────────────────────────────────────────────────
  "reviews-list.showRatingSummary": { label: "Show rating summary" },
  "reviews-list.productIdSource": { label: "Product source" },
  "reviews-list.productId": { label: "Pinned product ID" },
  "reviews-list.pageSize": { label: "Reviews per page" },
  "reviews-list.emptyMessage": { label: "Empty-state message" },

  // ── Cart Line Items ──────────────────────────────────────────────────────
  "cart-line-items.showVariants": {
    label: "Show variant labels",
    helpText: "Renders the selected size / colour / SKU under each line.",
  },
  "cart-line-items.showRemove": { label: "Show remove button" },
  "cart-line-items.qtyControls": {
    label: "Quantity control",
    tooltip: "Stepper buttons (− / +) or a numeric input field.",
  },
  "cart-line-items.emptyStateText": {
    label: "Empty cart copy",
    helpText: "Shown when the cart is empty.",
  },
  "cart-line-items.heading": { label: "Section heading" },
  "cart-line-items.thumbnailAspect": {
    label: "Thumbnail aspect",
    tooltip: "Aspect ratio for the product thumbnail in each line.",
  },

  // ── Order Summary ────────────────────────────────────────────────────────
  "order-summary.position": {
    label: "Summary position",
    tooltip:
      "On desktop, “right” pins the summary as a sticky right column; “below” stacks it under the line items.",
  },
  "order-summary.showPromoCode": { label: "Show promo code input" },
  "order-summary.showShippingEstimator": {
    label: "Show shipping estimator",
    helpText: "Adds a postal-code lookup above the totals.",
  },
  "order-summary.showTrustBadges": {
    label: "Show trust badges",
    tooltip: "Secure-checkout / returns badges below the CTA.",
  },
  "order-summary.checkoutLabel": {
    label: "Checkout button label",
    helpText: "Defaults to “Checkout”.",
  },
  "order-summary.subText": {
    label: "Microcopy under CTA",
    helpText: "Small print, e.g. “Trade pricing? Sign in →”.",
  },
  "order-summary.heading": { label: "Section heading" },

  // ── Account Bar ──────────────────────────────────────────────────────────
  "account-bar.showAccountNumber": { label: "Show account number" },
  "account-bar.showTier": {
    label: "Show pricing tier",
    helpText: "B2B-only — falls back to nothing if the viewer has no tier.",
  },
  "account-bar.showPo": {
    label: "Show PO reference",
    tooltip: "B2B inline purchase-order reference field.",
  },
  "account-bar.alignment": {
    label: "Layout",
    tooltip: "“Between” spreads info to the edges; “start” packs on the left.",
  },
  "account-bar.tone": {
    label: "Tone",
    tooltip:
      "“Default” matches the surface; “contrast” inverts to text-on-primary.",
  },
  "account-bar.guestText": {
    label: "Guest copy",
    helpText: "Shown when no viewer is logged in. Leave empty to hide.",
  },

  // ── Price Tiers ──────────────────────────────────────────────────────────
  "price-tiers.tiers": {
    label: "Volume tiers",
    tooltip: "Each row: minQty, optional maxQty, unit price, optional label.",
  },
  "price-tiers.highlightActive": {
    label: "Highlight active tier",
    helpText: "Visually pops the row matching the current cart quantity.",
  },
  "price-tiers.currency": {
    label: "Currency override",
    helpText: "ISO 4217 code (USD, INR, …). Falls back to the site default.",
  },
  "price-tiers.heading": { label: "Section heading" },
  "price-tiers.footnote": {
    label: "Footnote",
    helpText:
      "Small print under the table (e.g. “Wholesale tier requires a trade account”).",
  },
};

/**
 * Look up a field override.  Returns `undefined` when no override exists.
 */
export function getFieldOverride(
  blockKind: string,
  fieldName: string,
): FieldOverride | undefined {
  return INSPECTOR_OVERRIDES[`${blockKind}.${fieldName}`];
}
