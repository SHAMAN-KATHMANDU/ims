/**
 * Block schema — atoms of the tenant-site renderer.
 *
 * Adding a block kind = (1) add an entry to BlockPropsMap below, (2) create
 * a module under `../blocks/<kind>/` exporting `<Kind>Schema` + `<kind>Catalog`
 * and register it in `../blocks/index.ts`, (3) register a React component in
 * `apps/tenant-site/components/blocks/registry.ts`.
 *
 * Forward-compat: unknown kinds pass through the parser so older renderers
 * keep working on newer layouts.
 */

import { z } from "zod";
import {
  BlockStyleOverrideSchema,
  type BlockStyleOverride,
} from "./block-styles";
import { BLOCK_PROPS_SCHEMAS } from "../blocks";

// Import all block props types for BlockPropsMap
import type { SectionProps } from "../blocks/section/schema";
import type { HeadingProps } from "../blocks/heading/schema";
import type { RichTextProps } from "../blocks/rich-text/schema";
import type { ImageProps } from "../blocks/image/schema";
import type { ButtonProps } from "../blocks/button/schema";
import type { SpacerProps } from "../blocks/spacer/schema";
import type { DividerProps } from "../blocks/divider/schema";
import type { MarkdownBodyProps } from "../blocks/markdown-body/schema";
import type { ColumnsProps } from "../blocks/columns/schema";
import type { CssGridProps } from "../blocks/css-grid/schema";
import type { RowProps } from "../blocks/row/schema";
import type { HeroProps } from "../blocks/hero/schema";
import type { ProductGridProps } from "../blocks/product-grid/schema";
import type { CategoryTilesProps } from "../blocks/category-tiles/schema";
import type { ProductListingProps } from "../blocks/product-listing/schema";
import type { ProductFiltersProps } from "../blocks/product-filters/schema";
import type { BundleSpotlightProps } from "../blocks/bundle-spotlight/schema";
import type { GiftCardRedeemProps } from "../blocks/gift-card-redeem/schema";
import type { AnnouncementBarProps } from "../blocks/announcement-bar/schema";
import type { CollectionCardsProps } from "../blocks/collection-cards/schema";
import type { TrustStripProps } from "../blocks/trust-strip/schema";
import type { StorySplitProps } from "../blocks/story-split/schema";
import type { BentoShowcaseProps } from "../blocks/bento-showcase/schema";
import type { StatsBandProps } from "../blocks/stats-band/schema";
import type { NewsletterProps } from "../blocks/newsletter/schema";
import type { PolicyStripProps } from "../blocks/policy-strip/schema";
import type { ContactBlockProps } from "../blocks/contact-block/schema";
import type { FaqProps } from "../blocks/faq/schema";
import type { TestimonialsProps } from "../blocks/testimonials/schema";
import type { LogoCloudProps } from "../blocks/logo-cloud/schema";
import type { BlogListProps } from "../blocks/blog-list/schema";
import type { PdpGalleryProps } from "../blocks/pdp-gallery/schema";
import type { PdpBuyboxProps } from "../blocks/pdp-buybox/schema";
import type { PdpDetailsProps } from "../blocks/pdp-details/schema";
import type { PdpRelatedProps } from "../blocks/pdp-related/schema";
import type { BreadcrumbsProps } from "../blocks/breadcrumbs/schema";
import type { ProductComparisonProps } from "../blocks/product-comparison/schema";
import type { LookbookProps } from "../blocks/lookbook/schema";
import type { SizeGuideProps } from "../blocks/size-guide/schema";
import type { RecentlyViewedProps } from "../blocks/recently-viewed/schema";
import type { FbtProps } from "../blocks/fbt/schema";
import type { ReviewsListProps } from "../blocks/reviews-list/schema";
import type { EmbedProps } from "../blocks/embed/schema";
import type { VideoProps } from "../blocks/video/schema";
import type { AccordionProps } from "../blocks/accordion/schema";
import type { GalleryProps } from "../blocks/gallery/schema";
import type { TabsProps } from "../blocks/tabs/schema";
import type { FormBlockProps } from "../blocks/form/schema";
import type { EmptyStateProps } from "../blocks/empty-state/schema";
import type { CustomHtmlProps } from "../blocks/custom-html/schema";
import type { NavBarProps } from "../blocks/nav-bar/schema";
import type { LogoMarkProps } from "../blocks/logo-mark/schema";
import type { UtilityBarProps } from "../blocks/utility-bar/schema";
import type { FooterColumnsProps } from "../blocks/footer-columns/schema";
import type { SocialLinksProps } from "../blocks/social-links/schema";
import type { PaymentIconsProps } from "../blocks/payment-icons/schema";
import type { CopyrightBarProps } from "../blocks/copyright-bar/schema";

// Re-export for consumers
export type { SectionProps } from "../blocks/section/schema";
export type { HeadingProps } from "../blocks/heading/schema";
export type { RichTextProps } from "../blocks/rich-text/schema";
export type { ImageProps } from "../blocks/image/schema";
export type { ButtonProps } from "../blocks/button/schema";
export type { SpacerProps } from "../blocks/spacer/schema";
export type { DividerProps } from "../blocks/divider/schema";
export type { MarkdownBodyProps } from "../blocks/markdown-body/schema";
export type { ColumnsProps } from "../blocks/columns/schema";
export type { CssGridProps } from "../blocks/css-grid/schema";
export type { RowProps } from "../blocks/row/schema";
export type { HeroProps } from "../blocks/hero/schema";
export type { ProductGridProps } from "../blocks/product-grid/schema";
export type { CategoryTilesProps } from "../blocks/category-tiles/schema";
export type { ProductListingProps } from "../blocks/product-listing/schema";
export type { ProductFiltersProps } from "../blocks/product-filters/schema";
export type { BundleSpotlightProps } from "../blocks/bundle-spotlight/schema";
export type { GiftCardRedeemProps } from "../blocks/gift-card-redeem/schema";
export type { AnnouncementBarProps } from "../blocks/announcement-bar/schema";
export type {
  CollectionCardItem,
  CollectionCardsProps,
} from "../blocks/collection-cards/schema";
export type { TrustStripProps } from "../blocks/trust-strip/schema";
export type { StorySplitProps } from "../blocks/story-split/schema";
export type { BentoShowcaseProps } from "../blocks/bento-showcase/schema";
export type { StatsBandProps } from "../blocks/stats-band/schema";
export type { NewsletterProps } from "../blocks/newsletter/schema";
export type {
  PolicyItem,
  PolicyStripProps,
} from "../blocks/policy-strip/schema";
export type { ContactBlockProps } from "../blocks/contact-block/schema";
export type { FaqProps } from "../blocks/faq/schema";
export type { TestimonialsProps } from "../blocks/testimonials/schema";
export type { LogoCloudProps } from "../blocks/logo-cloud/schema";
export type { BlogListProps } from "../blocks/blog-list/schema";
export type { PdpGalleryProps } from "../blocks/pdp-gallery/schema";
export type { PdpBuyboxProps } from "../blocks/pdp-buybox/schema";
export type { PdpDetailsProps } from "../blocks/pdp-details/schema";
export type { PdpRelatedProps } from "../blocks/pdp-related/schema";
export type { BreadcrumbsProps } from "../blocks/breadcrumbs/schema";
export type { ProductComparisonProps } from "../blocks/product-comparison/schema";
export type {
  LookbookPin,
  LookbookScene,
  LookbookProps,
} from "../blocks/lookbook/schema";
export type { SizeGuideRow, SizeGuideProps } from "../blocks/size-guide/schema";
export type { RecentlyViewedProps } from "../blocks/recently-viewed/schema";
export type { FbtProps } from "../blocks/fbt/schema";
export type { ReviewsListProps } from "../blocks/reviews-list/schema";
export type { EmbedProps } from "../blocks/embed/schema";
export type { VideoProps } from "../blocks/video/schema";
export type { AccordionProps } from "../blocks/accordion/schema";
export type { GalleryProps } from "../blocks/gallery/schema";
export type { TabsProps } from "../blocks/tabs/schema";
export type { FormFieldDef, FormBlockProps } from "../blocks/form/schema";
export type { EmptyStateProps } from "../blocks/empty-state/schema";
export type { CustomHtmlProps } from "../blocks/custom-html/schema";
export type { NavBarProps } from "../blocks/nav-bar/schema";
export type { LogoMarkProps } from "../blocks/logo-mark/schema";
export type { UtilityBarProps } from "../blocks/utility-bar/schema";
export type { FooterColumnsProps } from "../blocks/footer-columns/schema";
export type { SocialLinksProps } from "../blocks/social-links/schema";
export type { PaymentIconsProps } from "../blocks/payment-icons/schema";
export type { CopyrightBarProps } from "../blocks/copyright-bar/schema";

export type { BlockStyle, BlockStyleOverride } from "./block-styles";
export {
  BlockStyleSchema,
  BlockStyleOverrideSchema,
  DEFAULT_BLOCK_STYLE,
  resolveBlockStyle,
} from "./block-styles";

// ---------------------------------------------------------------------------
// Structural types shared across blocks
// ---------------------------------------------------------------------------

export interface BlockVisibility {
  mobile?: boolean;
  tablet?: boolean;
  desktop?: boolean;
}

// ---------------------------------------------------------------------------
// The full map
// ---------------------------------------------------------------------------

export interface BlockPropsMap {
  // Structural / content
  section: SectionProps;
  heading: HeadingProps;
  "rich-text": RichTextProps;
  image: ImageProps;
  button: ButtonProps;
  spacer: SpacerProps;
  divider: DividerProps;
  "markdown-body": MarkdownBodyProps;
  // Commerce
  hero: HeroProps;
  "product-grid": ProductGridProps;
  "category-tiles": CategoryTilesProps;
  "product-listing": ProductListingProps;
  // Marketing
  "announcement-bar": AnnouncementBarProps;
  "collection-cards": CollectionCardsProps;
  "product-filters": ProductFiltersProps;
  "trust-strip": TrustStripProps;
  "story-split": StorySplitProps;
  "bento-showcase": BentoShowcaseProps;
  "stats-band": StatsBandProps;
  newsletter: NewsletterProps;
  "policy-strip": PolicyStripProps;
  "contact-block": ContactBlockProps;
  faq: FaqProps;
  testimonials: TestimonialsProps;
  "logo-cloud": LogoCloudProps;
  // Blog
  "blog-list": BlogListProps;
  // PDP
  "pdp-gallery": PdpGalleryProps;
  "pdp-buybox": PdpBuyboxProps;
  "pdp-details": PdpDetailsProps;
  "pdp-related": PdpRelatedProps;
  "reviews-list": ReviewsListProps;
  fbt: FbtProps;
  "recently-viewed": RecentlyViewedProps;
  "size-guide": SizeGuideProps;
  "product-comparison": ProductComparisonProps;
  lookbook: LookbookProps;
  breadcrumbs: BreadcrumbsProps;
  // Commerce (bundles + gift cards)
  "bundle-spotlight": BundleSpotlightProps;
  "gift-card-redeem": GiftCardRedeemProps;
  // Layer 2
  embed: EmbedProps;
  video: VideoProps;
  accordion: AccordionProps;
  columns: ColumnsProps;
  gallery: GalleryProps;
  tabs: TabsProps;
  form: FormBlockProps;
  // Layer 3
  "css-grid": CssGridProps;
  // Utility
  "empty-state": EmptyStateProps;
  // Header blocks
  "nav-bar": NavBarProps;
  "logo-mark": LogoMarkProps;
  "utility-bar": UtilityBarProps;
  // Footer blocks
  "footer-columns": FooterColumnsProps;
  "social-links": SocialLinksProps;
  "payment-icons": PaymentIconsProps;
  "copyright-bar": CopyrightBarProps;
  // Custom / advanced
  row: RowProps;
  "custom-html": CustomHtmlProps;
}

export type BlockKind = keyof BlockPropsMap;

/**
 * Per-device property overrides. When set, the renderer merges the
 * override props over the base props at the matching breakpoint. This
 * lets a tenant set a heading to level 1 on desktop but level 2 on
 * mobile, or change columns from 4 on desktop to 2 on mobile, etc.
 */
export interface BlockResponsiveOverrides {
  mobile?: Record<string, unknown>;
  tablet?: Record<string, unknown>;
}

export interface BlockNode<K extends BlockKind = BlockKind> {
  id: string;
  kind: K;
  props: BlockPropsMap[K];
  children?: BlockNode[];
  visibility?: BlockVisibility;
  style?: BlockStyleOverride;
  /** Per-device prop overrides (merged over base props at the breakpoint). */
  responsive?: BlockResponsiveOverrides;
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export const BlockVisibilitySchema: z.ZodType<BlockVisibility> = z
  .object({
    mobile: z.boolean().optional(),
    tablet: z.boolean().optional(),
    desktop: z.boolean().optional(),
  })
  .strict();

/**
 * Per-kind props validators. Backed by the per-block modules under
 * `../blocks/<kind>/`. Re-exported here so legacy importers keep working.
 */
export const BlockPropsSchemas = BLOCK_PROPS_SCHEMAS;

export const BlockNodeSchema: z.ZodType<BlockNode> = z.lazy(
  () =>
    z
      .object({
        id: z.string().min(1).max(80),
        kind: z.string().min(1).max(60),
        props: z.unknown(),
        children: z.array(BlockNodeSchema).optional(),
        visibility: BlockVisibilitySchema.optional(),
        style: BlockStyleOverrideSchema.optional(),
        responsive: z
          .object({
            mobile: z.record(z.unknown()).optional(),
            tablet: z.record(z.unknown()).optional(),
          })
          .strict()
          .optional(),
      })
      .passthrough()
      .superRefine((val, ctx) => {
        const kind = val.kind as string;
        const schema = (
          BlockPropsSchemas as Record<string, z.ZodType<unknown>>
        )[kind];
        if (!schema) return;
        const parsed = schema.safeParse(val.props);
        if (!parsed.success) {
          for (const issue of parsed.error.issues) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `props.${issue.path.join(".")}: ${issue.message}`,
              path: ["props", ...issue.path],
            });
          }
        }
      }) as unknown as z.ZodType<BlockNode>,
);

export const BlockTreeSchema = z.array(BlockNodeSchema);
export type BlockTree = BlockNode[];

// ---------------------------------------------------------------------------
// Scopes
// ---------------------------------------------------------------------------

export const SITE_LAYOUT_SCOPES = [
  "header",
  "footer",
  "home",
  "products-index",
  "product-detail",
  "offers",
  "blog-index",
  "blog-post",
  "contact",
  "page",
  "404",
  "landing",
  "not-found",
] as const;

export type SiteLayoutScope = (typeof SITE_LAYOUT_SCOPES)[number];

export const SiteLayoutScopeSchema = z.enum(SITE_LAYOUT_SCOPES);
