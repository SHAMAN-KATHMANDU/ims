/**
 * Tenant-site block registry.
 *
 * The tree of `kinds/` files in this folder are the *production* renderers
 * for the storefront — they layer real IMS data, theme tokens, Suspense
 * skeletons and a11y on top of the lightweight @repo/blocks placeholders.
 * Without the explicit override map below the storefront falls back to
 * the placeholders (e.g. `BundleSpotlight: "Bundle: my-slug"`), which is
 * how the long-standing "blocks aren't real" symptom slipped through —
 * the override file existed but was never wired in.
 *
 * Resolution order per kind: `tenantOverrides` → `@repo/blocks`. Adding a
 * new override is one line in the map below.
 */

import type { ComponentType, ReactNode } from "react";
import type { BlockKind, BlockNode } from "@repo/shared";
import { blockRegistry as packageRegistry } from "@repo/blocks";
import type { BlockDataContext } from "./data-context";

// ── Tenant-site implementations ─────────────────────────────────────────────

import {
  HeroBlock,
  ProductGridBlock,
  CategoryTilesBlock,
} from "./kinds/commerce-blocks";
import {
  AnnouncementBarBlock,
  CollectionCardsBlock,
  TrustStripBlock,
  StorySplitBlock,
  BentoShowcaseBlock,
  StatsBandBlock,
  NewsletterBlock,
  ContactBlock,
  FaqBlock,
  TestimonialsBlock,
  LogoCloudBlock,
} from "./kinds/marketing-blocks";
import {
  PdpBuyboxBlock,
  PdpDetailsBlock,
  PdpRelatedBlock,
  BreadcrumbsBlock,
} from "./kinds/pdp-blocks";
import {
  NavBarBlock,
  LogoMarkBlock,
  UtilityBarBlock,
} from "./kinds/HeaderBlocks";
import {
  FooterColumnsBlock,
  SocialLinksBlock,
  PaymentIconsBlock,
  CopyrightBarBlock,
} from "./kinds/FooterBlocks";
import {
  EmbedBlock,
  VideoBlock,
  AccordionBlock,
  ColumnsBlock,
  CssGridBlock,
} from "./kinds/layer2-blocks";
import {
  SectionBlock,
  HeadingBlock,
  RichTextBlock,
  ImageBlock,
  ButtonBlock,
  SpacerBlock,
  DividerBlock,
} from "./kinds/content-blocks";
import { BundleSpotlightBlock } from "./kinds/BundleSpotlightBlock";
import { TabsBlock } from "./kinds/TabsBlock";
import { GalleryBlock } from "./kinds/GalleryBlock";
import { CustomHtmlBlock } from "./kinds/CustomHtmlBlock";
import { EmptyStateBlock } from "./kinds/EmptyStateBlock";
import { MarkdownBodyBlock } from "./kinds/MarkdownBodyBlock";
import { RowBlock } from "./kinds/RowBlock";
import { FormBlock } from "./kinds/FormBlock";
import { PolicyStripBlock } from "./kinds/PolicyStripBlock";
import { PriceTiersBlock } from "./kinds/PriceTiersBlock";
import { OrderSummaryBlock } from "./kinds/OrderSummaryBlock";
import { CartLineItemsBlock } from "./kinds/CartLineItemsBlock";
import { AccountBarBlock } from "./kinds/AccountBarBlock";
import { ProductFiltersBlock } from "./kinds/ProductFiltersBlock";
import { ProductListingBlock } from "./kinds/ProductListingBlock";
import { ProductComparisonBlock } from "./kinds/ProductComparisonBlock";
import { LookbookBlock } from "./kinds/LookbookBlock";
import { GiftCardRedeemBlock } from "./kinds/GiftCardRedeemBlock";
import { PdpGalleryBlock } from "./kinds/PdpGalleryBlock";
import { ReviewsListBlock } from "./kinds/ReviewsListBlock";
import { FbtBlock } from "./kinds/FbtBlock";
import { RecentlyViewedBlock } from "./kinds/RecentlyViewedBlock";
import { SizeGuideBlock } from "./kinds/SizeGuideBlock";
import { BlogListBlock } from "./kinds/blog-blocks";
import { SnippetRefBlock } from "./kinds/SnippetRefBlock";

// ── Local entry shape (uses tenant-site's BlockDataContext) ─────────────────

export type BlockComponent = ComponentType<BlockComponentProps<any>>;

export interface BlockRegistryEntry {
  component: BlockComponent;
  /** When true, the block renders its own `children` and BlockRenderer
   *  must NOT auto-render `node.children` after the component. */
  container?: boolean;
}

export interface BlockComponentProps<P = unknown> {
  node: BlockNode;
  props: P;
  dataContext: BlockDataContext;
  children?: ReactNode;
}

// Container kinds whose component renders its own children. Mirrors the
// flag set on the @repo/blocks registry — if both registries disagree
// the override here wins because BlockRenderer reads from this map.
const CONTAINER_KINDS = new Set<BlockKind>([
  "section",
  "row",
  "columns",
  "css-grid",
]);

const tenantOverrides: Partial<Record<BlockKind, BlockComponent>> = {
  // Commerce
  hero: HeroBlock as BlockComponent,
  "product-grid": ProductGridBlock as BlockComponent,
  "category-tiles": CategoryTilesBlock as BlockComponent,
  "bundle-spotlight": BundleSpotlightBlock as BlockComponent,
  "product-listing": ProductListingBlock as BlockComponent,
  "product-filters": ProductFiltersBlock as BlockComponent,
  "product-comparison": ProductComparisonBlock as BlockComponent,
  "gift-card-redeem": GiftCardRedeemBlock as BlockComponent,
  "price-tiers": PriceTiersBlock as BlockComponent,

  // Marketing
  "announcement-bar": AnnouncementBarBlock as BlockComponent,
  "collection-cards": CollectionCardsBlock as BlockComponent,
  "trust-strip": TrustStripBlock as BlockComponent,
  "story-split": StorySplitBlock as BlockComponent,
  "bento-showcase": BentoShowcaseBlock as BlockComponent,
  "stats-band": StatsBandBlock as BlockComponent,
  newsletter: NewsletterBlock as BlockComponent,
  "contact-block": ContactBlock as BlockComponent,
  faq: FaqBlock as BlockComponent,
  testimonials: TestimonialsBlock as BlockComponent,
  "logo-cloud": LogoCloudBlock as BlockComponent,
  "policy-strip": PolicyStripBlock as BlockComponent,

  // PDP
  "pdp-buybox": PdpBuyboxBlock as BlockComponent,
  "pdp-details": PdpDetailsBlock as BlockComponent,
  "pdp-related": PdpRelatedBlock as BlockComponent,
  "pdp-gallery": PdpGalleryBlock as BlockComponent,
  breadcrumbs: BreadcrumbsBlock as BlockComponent,
  "reviews-list": ReviewsListBlock as BlockComponent,
  fbt: FbtBlock as BlockComponent,
  "recently-viewed": RecentlyViewedBlock as BlockComponent,
  "size-guide": SizeGuideBlock as BlockComponent,
  lookbook: LookbookBlock as BlockComponent,

  // Header
  "nav-bar": NavBarBlock as BlockComponent,
  "logo-mark": LogoMarkBlock as BlockComponent,
  "utility-bar": UtilityBarBlock as BlockComponent,

  // Footer
  "footer-columns": FooterColumnsBlock as BlockComponent,
  "social-links": SocialLinksBlock as BlockComponent,
  "payment-icons": PaymentIconsBlock as BlockComponent,
  "copyright-bar": CopyrightBarBlock as BlockComponent,

  // Layout / structural
  section: SectionBlock as BlockComponent,
  row: RowBlock as BlockComponent,
  columns: ColumnsBlock as BlockComponent,
  "css-grid": CssGridBlock as BlockComponent,

  // Content
  heading: HeadingBlock as BlockComponent,
  "rich-text": RichTextBlock as BlockComponent,
  image: ImageBlock as BlockComponent,
  button: ButtonBlock as BlockComponent,
  spacer: SpacerBlock as BlockComponent,
  divider: DividerBlock as BlockComponent,
  embed: EmbedBlock as BlockComponent,
  video: VideoBlock as BlockComponent,
  accordion: AccordionBlock as BlockComponent,
  tabs: TabsBlock as BlockComponent,
  gallery: GalleryBlock as BlockComponent,
  "custom-html": CustomHtmlBlock as BlockComponent,
  "empty-state": EmptyStateBlock as BlockComponent,
  "markdown-body": MarkdownBodyBlock as BlockComponent,
  form: FormBlock as BlockComponent,

  // Cart / checkout / blog / snippet
  "cart-line-items": CartLineItemsBlock as BlockComponent,
  "order-summary": OrderSummaryBlock as BlockComponent,
  "account-bar": AccountBarBlock as BlockComponent,
  "blog-list": BlogListBlock as BlockComponent,
  "snippet-ref": SnippetRefBlock as BlockComponent,
};

/**
 * Merged registry: tenant-site overrides → @repo/blocks fallback for any
 * kind without a tenant-site implementation yet (e.g. brand-new kinds
 * added in @repo/blocks before the tenant-site renderer is ready).
 *
 * Computed once at module load — adding/removing entries forces a
 * server restart, matching how the editor palette is loaded too.
 */
export const blockRegistry: Record<BlockKind, BlockRegistryEntry> = (() => {
  const merged: Partial<Record<BlockKind, BlockRegistryEntry>> = {};
  for (const kind of Object.keys(packageRegistry) as BlockKind[]) {
    const override = tenantOverrides[kind];
    merged[kind] = {
      component: (override ??
        packageRegistry[kind].component) as BlockComponent,
      container: CONTAINER_KINDS.has(kind),
    };
  }
  return merged as Record<BlockKind, BlockRegistryEntry>;
})();
