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
import type { BlockNode } from "@repo/shared";
import type { BlockDataContext } from "./data-context";

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
import {
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

export const blockRegistry: Record<string, BlockRegistryEntry> = {
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
  "trust-strip": { component: TrustStripBlock },
  "story-split": { component: StorySplitBlock },
  "bento-showcase": { component: BentoShowcaseBlock },
  "stats-band": { component: StatsBandBlock },
  newsletter: { component: NewsletterBlock },
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
  breadcrumbs: { component: BreadcrumbsBlock },
};
