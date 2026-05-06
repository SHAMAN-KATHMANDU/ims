/**
 * Shared cart layout — used by all templates.
 *
 * The cart scope is editable: tenants can rearrange the line items, summary,
 * and any cross-sell or recommended grids. Each template can override
 * styling via theme tokens; structurally the layouts are nearly identical.
 *
 * Tenants who want to deviate (e.g. promote a coupon banner above the
 * line items) duplicate the seed and edit it through the builder UI —
 * the seeded tree is just a starting point, not a contract.
 */

import type { BlockNode } from "@repo/shared";
import { block } from "./factories";

export interface CartLayoutOptions {
  /** Show a "Often paired with" cross-sell row below the line items. */
  crossSell?: boolean;
  /** "right" places the summary in a sticky right column on desktop. */
  summaryPosition?: "right" | "below";
  /** Heading shown at the top of the cart page. */
  heading?: string;
  /** Add a slim B2B account-bar above the heading (Forge only). */
  accountBar?: boolean;
  /** Override checkout CTA label. */
  checkoutLabel?: string;
}

export function cartLayout(opts: CartLayoutOptions = {}): BlockNode[] {
  const summaryPosition = opts.summaryPosition ?? "right";
  const heading = opts.heading ?? "Your bag";
  const checkoutLabel = opts.checkoutLabel ?? "Proceed to checkout";

  const tree: BlockNode[] = [];

  if (opts.accountBar) {
    tree.push(
      block("account-bar", {
        showAccountNumber: true,
        showTier: true,
        showPo: true,
        alignment: "between",
        tone: "default",
      }),
    );
  }

  tree.push(
    block("heading", {
      text: heading,
      level: 1,
      alignment: "start",
    }),
  );

  if (summaryPosition === "right") {
    tree.push({
      ...block("columns", {
        count: 2,
        gap: "lg",
        verticalAlign: "start",
        stackBelow: "lg",
        stickyFirst: false,
      }),
      children: [
        // Left column: line items + optional cross-sell
        {
          ...block("section", {
            paddingY: "none",
            maxWidth: "full",
          }),
          children: [
            block("cart-line-items", {
              showVariants: true,
              showRemove: true,
              qtyControls: "stepper",
              emptyStateText: "Your cart is empty.",
              thumbnailAspect: "1/1",
            }),
            ...(opts.crossSell
              ? [
                  block("product-grid", {
                    eyebrow: "Often paired with",
                    source: "featured",
                    columns: 4,
                    limit: 4,
                    cardVariant: "bare",
                  }),
                ]
              : []),
          ],
        },
        // Right column: order summary
        block("order-summary", {
          position: "right",
          showPromoCode: true,
          showShippingEstimator: false,
          showTrustBadges: true,
          checkoutLabel,
          heading: "Summary",
        }),
      ],
    });
  } else {
    // Stacked: line items, optional cross-sell, then summary below
    tree.push(
      block("cart-line-items", {
        showVariants: true,
        showRemove: true,
        qtyControls: "stepper",
        emptyStateText: "Your cart is empty.",
        thumbnailAspect: "1/1",
      }),
    );
    if (opts.crossSell) {
      tree.push(
        block("product-grid", {
          eyebrow: "Often paired with",
          source: "featured",
          columns: 4,
          limit: 4,
          cardVariant: "bare",
        }),
      );
    }
    tree.push(
      block("order-summary", {
        position: "below",
        showPromoCode: true,
        showShippingEstimator: false,
        showTrustBadges: true,
        checkoutLabel,
        heading: "Summary",
      }),
    );
  }

  return tree;
}
