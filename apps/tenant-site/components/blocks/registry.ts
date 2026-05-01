/**
 * Block registry — maps BlockKind → React component + metadata.
 *
 * Adding a block kind:
 *   1. Add props type + Zod schema in @repo/shared site-schema/blocks.ts
 *   2. Write the component in components/blocks/kinds/<Name>Block.tsx
 *   3. Register it here
 *
 * `container: true` signals that the block renders its own `children`
 * (section wraps them in padding, for example). Non-container leaf blocks
 * can still accept children, which the BlockRenderer appends after the
 * block's rendered output.
 */

import type { ComponentType, ReactNode } from "react";
import type { BlockKind, BlockNode } from "@repo/shared";
import type { BlockDataContext } from "./data-context";

// Export block prop types for use in block implementations
export type {
  NavBarProps,
  LogoMarkProps,
  UtilityBarProps,
} from "./kinds/HeaderBlocks";
export type {
  FooterColumnsProps,
  SocialLinksProps,
  PaymentIconsProps,
  CopyrightBarProps,
} from "./kinds/FooterBlocks";

// Content / structural
import { SectionBlock } from "./kinds/content-blocks";
import {
  HeadingBlock,
  RichTextBlock,
  ImageBlock,
  ButtonBlock,
  SpacerBlock,
  DividerBlock,
} from "./kinds/content-blocks";
import { MarkdownBodyBlock } from "./kinds/MarkdownBodyBlock";

// Commerce
import {
  HeroBlock,
  ProductGridBlock,
  CategoryTilesBlock,
} from "./kinds/commerce-blocks";
import { ProductListingBlock } from "./kinds/ProductListingBlock";

// Marketing
import { ProductFiltersBlock } from "./kinds/ProductFiltersBlock";
import {
  AnnouncementBarBlock,
  CollectionCardsBlock,
  TrustStripBlock,
  StorySplitBlock,
  BentoShowcaseBlock,
  StatsBandBlock,
  NewsletterBlock,
  ContactBlock as ContactBlockBlock,
  FaqBlock,
  TestimonialsBlock,
  LogoCloudBlock,
} from "./kinds/marketing-blocks";

// Blog
import { BlogListBlock } from "./kinds/blog-blocks";

// PDP
import {
  PdpBuyboxBlock,
  PdpDetailsBlock,
  PdpRelatedBlock,
  BreadcrumbsBlock,
} from "./kinds/pdp-blocks";
import { PdpGalleryBlock } from "./kinds/PdpGalleryBlock";
import { ReviewsListBlock } from "./kinds/ReviewsListBlock";
import { FbtBlock } from "./kinds/FbtBlock";
import { RecentlyViewedBlock } from "./kinds/RecentlyViewedBlock";
import { SizeGuideBlock } from "./kinds/SizeGuideBlock";
import { ProductComparisonBlock } from "./kinds/ProductComparisonBlock";
import { LookbookBlock } from "./kinds/LookbookBlock";

// Layer 2
import {
  EmbedBlock,
  VideoBlock,
  AccordionBlock,
  ColumnsBlock,
  CssGridBlock,
} from "./kinds/layer2-blocks";
import { GalleryBlock } from "./kinds/GalleryBlock";
import { TabsBlock } from "./kinds/TabsBlock";
import { FormBlock } from "./kinds/FormBlock";

// Utility / new gap blocks
import { PolicyStripBlock } from "./kinds/PolicyStripBlock";
import { EmptyStateBlock } from "./kinds/EmptyStateBlock";

// Custom / advanced
import { RowBlock } from "./kinds/RowBlock";
import { CustomHtmlBlock } from "./kinds/CustomHtmlBlock";

// Commerce (bundles + gift cards)
import { BundleSpotlightBlock } from "./kinds/BundleSpotlightBlock";
import { GiftCardRedeemBlock } from "./kinds/GiftCardRedeemBlock";

// Header blocks
import {
  NavBarBlock,
  LogoMarkBlock,
  UtilityBarBlock,
} from "./kinds/HeaderBlocks";

// Footer blocks
import {
  FooterColumnsBlock,
  SocialLinksBlock,
  PaymentIconsBlock,
  CopyrightBarBlock,
} from "./kinds/FooterBlocks";

export type BlockComponentProps<P = unknown> = {
  node: BlockNode;
  props: P;
  dataContext: BlockDataContext;
  children?: ReactNode;
};

export type BlockComponent = ComponentType<BlockComponentProps<any>>;

export interface BlockRegistryEntry {
  component: BlockComponent;
  /** When true, the block renders its own `children`. */
  container?: boolean;
}

export const blockRegistry: Record<BlockKind, BlockRegistryEntry> = {
  // Structural / content
  section: { component: SectionBlock, container: true },
  heading: { component: HeadingBlock },
  "rich-text": { component: RichTextBlock },
  image: { component: ImageBlock },
  button: { component: ButtonBlock },
  spacer: { component: SpacerBlock },
  divider: { component: DividerBlock },
  "markdown-body": { component: MarkdownBodyBlock },
  // Commerce
  hero: { component: HeroBlock },
  "product-grid": { component: ProductGridBlock },
  "category-tiles": { component: CategoryTilesBlock },
  "product-listing": { component: ProductListingBlock },
  // Marketing
  "announcement-bar": { component: AnnouncementBarBlock },
  "collection-cards": { component: CollectionCardsBlock },
  "product-filters": { component: ProductFiltersBlock },
  "trust-strip": { component: TrustStripBlock },
  "story-split": { component: StorySplitBlock },
  "bento-showcase": { component: BentoShowcaseBlock },
  "stats-band": { component: StatsBandBlock },
  newsletter: { component: NewsletterBlock },
  "policy-strip": { component: PolicyStripBlock },
  "contact-block": { component: ContactBlockBlock },
  faq: { component: FaqBlock },
  testimonials: { component: TestimonialsBlock },
  "logo-cloud": { component: LogoCloudBlock },
  // Blog
  "blog-list": { component: BlogListBlock },
  // PDP
  "pdp-gallery": { component: PdpGalleryBlock },
  "pdp-buybox": { component: PdpBuyboxBlock },
  "pdp-details": { component: PdpDetailsBlock },
  "pdp-related": { component: PdpRelatedBlock },
  "reviews-list": { component: ReviewsListBlock },
  fbt: { component: FbtBlock },
  "recently-viewed": { component: RecentlyViewedBlock },
  "size-guide": { component: SizeGuideBlock },
  "product-comparison": { component: ProductComparisonBlock },
  lookbook: { component: LookbookBlock },
  breadcrumbs: { component: BreadcrumbsBlock },
  // Layer 2
  embed: { component: EmbedBlock },
  video: { component: VideoBlock },
  accordion: { component: AccordionBlock },
  columns: { component: ColumnsBlock, container: true },
  gallery: { component: GalleryBlock },
  tabs: { component: TabsBlock },
  form: { component: FormBlock },
  // Layer 3
  "css-grid": { component: CssGridBlock, container: true },
  // Utility
  "empty-state": { component: EmptyStateBlock },
  // Commerce (bundles + gift cards)
  "bundle-spotlight": { component: BundleSpotlightBlock },
  "gift-card-redeem": { component: GiftCardRedeemBlock },
  // Custom / advanced
  row: { component: RowBlock, container: true },
  "custom-html": { component: CustomHtmlBlock },
  // Header blocks
  "nav-bar": { component: NavBarBlock },
  "logo-mark": { component: LogoMarkBlock },
  "utility-bar": { component: UtilityBarBlock },
  // Footer blocks
  "footer-columns": { component: FooterColumnsBlock },
  "social-links": { component: SocialLinksBlock },
  "payment-icons": { component: PaymentIconsBlock },
  "copyright-bar": { component: CopyrightBarBlock },
};
