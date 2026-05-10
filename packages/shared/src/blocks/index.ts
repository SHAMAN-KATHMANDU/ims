/**
 * Blocks barrel — aggregates per-block modules and exports unified registries.
 *
 * Each block kind owns a folder under `./<kind>/` exporting:
 *   - <KindPascal>Schema  — Zod validator for the block's props
 *   - <kindCamel>Catalog  — palette metadata + default-props factory
 *
 * To add a new block:
 *   1. Create `./<kind>/{schema,catalog,index}.ts` mirroring `./button/`.
 *   2. Add an import here.
 *   3. Append the catalog to `BLOCK_CATALOG_ENTRIES` (in palette display order).
 *   4. Add the schema to `BLOCK_PROPS_SCHEMAS`.
 *   5. Add a renderer in `apps/tenant-site/components/blocks/kinds/`.
 */

export type { CatalogCategory, CatalogScope, CatalogEntry } from "./types";
export { blocksToMarkdown, blockToMarkdown } from "./serialize";
export type {
  NavBarProps,
  NavBarItem,
  NavBarBrand,
  NavBarCta,
  NavBarUtilityBar,
  NavBarMobileDrawer,
} from "./nav-bar";

import type { BlockKind } from "../site-schema/blocks";
import type { CatalogEntry } from "./types";
import type { z } from "zod";

// Layout
import { SectionSchema, sectionCatalog } from "./section";
import { SpacerSchema, spacerCatalog } from "./spacer";
import { DividerSchema, dividerCatalog } from "./divider";
import { ColumnsSchema, columnsCatalog } from "./columns";
import { CssGridSchema, cssGridCatalog } from "./css-grid";
import { RowSchema, rowCatalog } from "./row";

// Content
import { HeadingSchema, headingCatalog } from "./heading";
import { RichTextSchema, richTextCatalog } from "./rich-text";
import { ImageSchema, imageCatalog } from "./image";
import { ButtonSchema, buttonCatalog } from "./button";
import { MarkdownBodySchema, markdownBodyCatalog } from "./markdown-body";
import { EmbedSchema, embedCatalog } from "./embed";
import { VideoSchema, videoCatalog } from "./video";
import { AccordionSchema, accordionCatalog } from "./accordion";
import { GallerySchema, galleryCatalog } from "./gallery";
import { TabsSchema, tabsCatalog } from "./tabs";
import { CustomHtmlSchema, customHtmlCatalog } from "./custom-html";
import { EmptyStateSchema, emptyStateCatalog } from "./empty-state";

// Commerce
import { HeroSchema, heroCatalog } from "./hero";
import {
  ProductGridSchema,
  productGridCatalog,
  productGridNewArrivalsCatalog,
  productGridHotDealsCatalog,
  productGridStaffPicksCatalog,
  productGridTrendingCatalog,
} from "./product-grid";
import { CategoryTilesSchema, categoryTilesCatalog } from "./category-tiles";
import { ProductListingSchema, productListingCatalog } from "./product-listing";
import { ProductFiltersSchema, productFiltersCatalog } from "./product-filters";
import {
  BundleSpotlightSchema,
  bundleSpotlightCatalog,
} from "./bundle-spotlight";
import {
  GiftCardRedeemSchema,
  giftCardRedeemCatalog,
} from "./gift-card-redeem";

// Marketing
import {
  CollectionCardsSchema,
  collectionCardsCatalog,
} from "./collection-cards";
import {
  AnnouncementBarSchema,
  announcementBarCatalog,
} from "./announcement-bar";
import { TrustStripSchema, trustStripCatalog } from "./trust-strip";
import { StorySplitSchema, storySplitCatalog } from "./story-split";
import { BentoShowcaseSchema, bentoShowcaseCatalog } from "./bento-showcase";
import { StatsBandSchema, statsBandCatalog } from "./stats-band";
import { NewsletterSchema, newsletterCatalog } from "./newsletter";
import { ContactBlockSchema, contactBlockCatalog } from "./contact-block";
import { FaqSchema, faqCatalog } from "./faq";
import { TestimonialsSchema, testimonialsCatalog } from "./testimonials";
import { LogoCloudSchema, logoCloudCatalog } from "./logo-cloud";
import { FormSchema, formCatalog } from "./form";
import { PolicyStripSchema, policyStripCatalog } from "./policy-strip";

// Blog
import { BlogListSchema, blogListCatalog } from "./blog-list";

// PDP
import { PdpGallerySchema, pdpGalleryCatalog } from "./pdp-gallery";
import { PdpBuyboxSchema, pdpBuyboxCatalog } from "./pdp-buybox";
import { PdpDetailsSchema, pdpDetailsCatalog } from "./pdp-details";
import { PdpRelatedSchema, pdpRelatedCatalog } from "./pdp-related";
import { BreadcrumbsSchema, breadcrumbsCatalog } from "./breadcrumbs";
import { RecentlyViewedSchema, recentlyViewedCatalog } from "./recently-viewed";
import { ReviewsListSchema, reviewsListCatalog } from "./reviews-list";
import { FbtSchema, fbtCatalog } from "./fbt";
import { SizeGuideSchema, sizeGuideCatalog } from "./size-guide";
import {
  ProductComparisonSchema,
  productComparisonCatalog,
} from "./product-comparison";
import { LookbookSchema, lookbookCatalog } from "./lookbook";

// Header / Footer
import { NavBarSchema, navBarCatalog } from "./nav-bar";
import { LogoMarkSchema, logoMarkCatalog } from "./logo-mark";
import { UtilityBarSchema, utilityBarCatalog } from "./utility-bar";
import { FooterColumnsSchema, footerColumnsCatalog } from "./footer-columns";
import { SocialLinksSchema, socialLinksCatalog } from "./social-links";
import { PaymentIconsSchema, paymentIconsCatalog } from "./payment-icons";
import { CopyrightBarSchema, copyrightBarCatalog } from "./copyright-bar";

// Cart / commerce checkout
import { CartLineItemsSchema, cartLineItemsCatalog } from "./cart-line-items";
import { OrderSummarySchema, orderSummaryCatalog } from "./order-summary";
import { AccountBarSchema, accountBarCatalog } from "./account-bar";
import { CheckoutFormSchema, checkoutFormCatalog } from "./checkout-form";
import { PriceTiersSchema, priceTiersCatalog } from "./price-tiers";

// Phase 5: reusable sub-trees
import { SnippetRefSchema, snippetRefCatalog } from "./snippet-ref";

/**
 * Catalog entries in palette display order. Order here is the order the
 * editor's block palette presents within each category, so changes are
 * user-visible — be deliberate.
 */
export const BLOCK_CATALOG_ENTRIES: readonly CatalogEntry[] = [
  // Layout / structural
  sectionCatalog,
  spacerCatalog,
  dividerCatalog,
  columnsCatalog,
  cssGridCatalog,
  rowCatalog,

  // Content
  headingCatalog,
  richTextCatalog,
  imageCatalog,
  buttonCatalog,
  markdownBodyCatalog,
  embedCatalog,
  videoCatalog,
  accordionCatalog,
  galleryCatalog,
  tabsCatalog,
  customHtmlCatalog,
  emptyStateCatalog,

  // Commerce
  heroCatalog,
  productGridCatalog,
  productGridNewArrivalsCatalog,
  productGridHotDealsCatalog,
  productGridStaffPicksCatalog,
  productGridTrendingCatalog,
  categoryTilesCatalog,
  productListingCatalog,
  productFiltersCatalog,
  bundleSpotlightCatalog,
  giftCardRedeemCatalog,

  // Marketing
  collectionCardsCatalog,
  announcementBarCatalog,
  trustStripCatalog,
  storySplitCatalog,
  bentoShowcaseCatalog,
  statsBandCatalog,
  newsletterCatalog,
  contactBlockCatalog,
  faqCatalog,
  testimonialsCatalog,
  logoCloudCatalog,
  formCatalog,
  policyStripCatalog,

  // Blog
  blogListCatalog,

  // PDP
  pdpGalleryCatalog,
  pdpBuyboxCatalog,
  pdpDetailsCatalog,
  pdpRelatedCatalog,
  breadcrumbsCatalog,
  recentlyViewedCatalog,
  reviewsListCatalog,
  fbtCatalog,
  sizeGuideCatalog,
  productComparisonCatalog,
  lookbookCatalog,

  // Header / Footer
  navBarCatalog,
  logoMarkCatalog,
  utilityBarCatalog,
  footerColumnsCatalog,
  socialLinksCatalog,
  paymentIconsCatalog,
  copyrightBarCatalog,

  // Cart / commerce checkout
  accountBarCatalog,
  cartLineItemsCatalog,
  orderSummaryCatalog,
  checkoutFormCatalog,
  priceTiersCatalog,

  // Phase 5: reusable sub-trees
  snippetRefCatalog,
];

/**
 * Per-kind Zod schema map. Keyed by BlockKind so site-schema/blocks.ts can
 * substitute these for the legacy inline `BlockPropsSchemas` literal.
 *
 * The value type is `z.ZodType<unknown>` rather than the per-block precise
 * type because TypeScript can't infer a discriminated union over the kind
 * key cleanly. The runtime parsers preserve their full per-schema validation.
 */
export const BLOCK_PROPS_SCHEMAS: Record<BlockKind, z.ZodType<unknown>> = {
  section: SectionSchema,
  heading: HeadingSchema,
  "rich-text": RichTextSchema,
  image: ImageSchema,
  button: ButtonSchema,
  spacer: SpacerSchema,
  divider: DividerSchema,
  "markdown-body": MarkdownBodySchema,
  hero: HeroSchema,
  "product-grid": ProductGridSchema,
  "category-tiles": CategoryTilesSchema,
  "product-listing": ProductListingSchema,
  "announcement-bar": AnnouncementBarSchema,
  "collection-cards": CollectionCardsSchema,
  "product-filters": ProductFiltersSchema,
  "trust-strip": TrustStripSchema,
  "story-split": StorySplitSchema,
  "bento-showcase": BentoShowcaseSchema,
  "stats-band": StatsBandSchema,
  newsletter: NewsletterSchema,
  "policy-strip": PolicyStripSchema,
  "contact-block": ContactBlockSchema,
  faq: FaqSchema,
  testimonials: TestimonialsSchema,
  "logo-cloud": LogoCloudSchema,
  "blog-list": BlogListSchema,
  "pdp-gallery": PdpGallerySchema,
  "pdp-buybox": PdpBuyboxSchema,
  "pdp-details": PdpDetailsSchema,
  "pdp-related": PdpRelatedSchema,
  "reviews-list": ReviewsListSchema,
  fbt: FbtSchema,
  "recently-viewed": RecentlyViewedSchema,
  "size-guide": SizeGuideSchema,
  "product-comparison": ProductComparisonSchema,
  lookbook: LookbookSchema,
  breadcrumbs: BreadcrumbsSchema,
  "bundle-spotlight": BundleSpotlightSchema,
  "gift-card-redeem": GiftCardRedeemSchema,
  embed: EmbedSchema,
  video: VideoSchema,
  accordion: AccordionSchema,
  columns: ColumnsSchema,
  gallery: GallerySchema,
  tabs: TabsSchema,
  form: FormSchema,
  "css-grid": CssGridSchema,
  "empty-state": EmptyStateSchema,
  "nav-bar": NavBarSchema,
  "logo-mark": LogoMarkSchema,
  "utility-bar": UtilityBarSchema,
  "footer-columns": FooterColumnsSchema,
  "social-links": SocialLinksSchema,
  "payment-icons": PaymentIconsSchema,
  "copyright-bar": CopyrightBarSchema,
  row: RowSchema,
  "custom-html": CustomHtmlSchema,
  "cart-line-items": CartLineItemsSchema,
  "order-summary": OrderSummarySchema,
  "account-bar": AccountBarSchema,
  "checkout-form": CheckoutFormSchema,
  "price-tiers": PriceTiersSchema,
  "snippet-ref": SnippetRefSchema,
};
