import type { BlockKind } from "@repo/shared";
import type { BlockComponent, BlockRegistryEntry } from "./types";

// Content / layout blocks
import { SectionBlock } from "./components/layout/SectionBlock";
import { RowBlock } from "./components/layout/RowBlock";
import { ColumnsBlock } from "./components/layout/ColumnsBlock";
import { CssGridBlock } from "./components/layout/CssGridBlock";

// Content blocks
import {
  HeadingBlock,
  RichTextBlock,
  ImageBlock,
  ButtonBlock,
  SpacerBlock,
  DividerBlock,
} from "./components/content/ContentBlocks";
import { MarkdownBodyBlock } from "./components/content/MarkdownBodyBlock";
import { EmbedBlock } from "./components/content/EmbedBlock";
import { VideoBlock } from "./components/content/VideoBlock";
import { AccordionBlock } from "./components/content/AccordionBlock";
import { GalleryBlock } from "./components/content/GalleryBlock";
import { TabsBlock } from "./components/content/TabsBlock";
import { CustomHtmlBlock } from "./components/content/CustomHtmlBlock";
import { EmptyStateBlock } from "./components/content/EmptyStateBlock";
import { BreadcrumbsBlock } from "./components/content/BreadcrumbsBlock";

// Commerce blocks
import { HeroBlock } from "./components/commerce/HeroBlock";
import { ProductGridBlock } from "./components/commerce/ProductGridBlock";
import { CategoryTilesBlock } from "./components/commerce/CategoryTilesBlock";
import { ProductListingBlock } from "./components/commerce/ProductListingBlock";
import { ProductFiltersBlock } from "./components/commerce/ProductFiltersBlock";
import { BundleSpotlightBlock } from "./components/commerce/BundleSpotlightBlock";
import { GiftCardRedeemBlock } from "./components/commerce/GiftCardRedeemBlock";
import { CartLineItemsBlock } from "./components/commerce/CartLineItemsBlock";
import { OrderSummaryBlock } from "./components/commerce/OrderSummaryBlock";
import { PriceTiersBlock } from "./components/commerce/PriceTiersBlock";

// Marketing blocks
import { AnnouncementBarBlock } from "./components/marketing/AnnouncementBarBlock";
import { CollectionCardsBlock } from "./components/marketing/CollectionCardsBlock";
import { TrustStripBlock } from "./components/marketing/TrustStripBlock";
import { StorySplitBlock } from "./components/marketing/StorySplitBlock";
import { BentoShowcaseBlock } from "./components/marketing/BentoShowcaseBlock";
import { StatsBandBlock } from "./components/marketing/StatsBandBlock";
import { NewsletterBlock } from "./components/marketing/NewsletterBlock";
import { ContactBlockComp } from "./components/marketing/ContactBlock";
import { FaqBlock } from "./components/marketing/FaqBlock";
import { TestimonialsBlock } from "./components/marketing/TestimonialsBlock";
import { LogoCloudBlock } from "./components/marketing/LogoCloudBlock";
import { PolicyStripBlock } from "./components/marketing/PolicyStripBlock";

// Blog blocks
import { BlogListBlock } from "./components/blog/BlogListBlock";

// PDP blocks
import { PdpGalleryBlock } from "./components/pdp/PdpGalleryBlock";
import { PdpBuyboxBlock } from "./components/pdp/PdpBuyboxBlock";
import { PdpDetailsBlock } from "./components/pdp/PdpDetailsBlock";
import { PdpRelatedBlock } from "./components/pdp/PdpRelatedBlock";
import { ReviewsListBlock } from "./components/pdp/ReviewsListBlock";
import { FbtBlock } from "./components/pdp/FbtBlock";
import { RecentlyViewedBlock } from "./components/pdp/RecentlyViewedBlock";
import { SizeGuideBlock } from "./components/pdp/SizeGuideBlock";
import { ProductComparisonBlock } from "./components/pdp/ProductComparisonBlock";
import { LookbookBlock } from "./components/pdp/LookbookBlock";

// Header / Footer blocks
import { NavBarBlock } from "./components/header/NavBarBlock";
import { LogoMarkBlock } from "./components/header/LogoMarkBlock";
import { UtilityBarBlock } from "./components/header/UtilityBarBlock";
import { FooterColumnsBlock } from "./components/footer/FooterColumnsBlock";
import { SocialLinksBlock } from "./components/footer/SocialLinksBlock";
import { PaymentIconsBlock } from "./components/footer/PaymentIconsBlock";
import { CopyrightBarBlock } from "./components/footer/CopyrightBarBlock";

// Checkout blocks
import { AccountBarBlock } from "./components/checkout/AccountBarBlock";
import { CheckoutFormBlock } from "./components/checkout/CheckoutFormBlock";

// Reusable sub-trees
import { SnippetRefBlock } from "./components/SnippetRefBlock";

// Form blocks
import { FormBlock } from "./components/content/FormBlock";

export const blockRegistry: Record<BlockKind, BlockRegistryEntry> = {
  // Layout
  section: { component: SectionBlock as BlockComponent, container: true },
  row: { component: RowBlock as BlockComponent, container: true },
  columns: { component: ColumnsBlock as BlockComponent, container: true },
  "css-grid": { component: CssGridBlock as BlockComponent, container: true },

  // Content
  heading: { component: HeadingBlock as BlockComponent },
  "rich-text": { component: RichTextBlock as BlockComponent },
  image: { component: ImageBlock as BlockComponent },
  button: { component: ButtonBlock as BlockComponent },
  spacer: { component: SpacerBlock as BlockComponent },
  divider: { component: DividerBlock as BlockComponent },
  "markdown-body": { component: MarkdownBodyBlock as BlockComponent },
  embed: { component: EmbedBlock as BlockComponent },
  video: { component: VideoBlock as BlockComponent },
  accordion: { component: AccordionBlock as BlockComponent },
  gallery: { component: GalleryBlock as BlockComponent },
  tabs: { component: TabsBlock as BlockComponent },
  "custom-html": { component: CustomHtmlBlock as BlockComponent },
  "empty-state": { component: EmptyStateBlock as BlockComponent },
  breadcrumbs: { component: BreadcrumbsBlock as BlockComponent },

  // Commerce
  hero: { component: HeroBlock as BlockComponent },
  "product-grid": { component: ProductGridBlock as BlockComponent },
  "category-tiles": { component: CategoryTilesBlock as BlockComponent },
  "product-listing": { component: ProductListingBlock as BlockComponent },
  "product-filters": { component: ProductFiltersBlock as BlockComponent },
  "bundle-spotlight": { component: BundleSpotlightBlock as BlockComponent },
  "gift-card-redeem": { component: GiftCardRedeemBlock as BlockComponent },
  "cart-line-items": { component: CartLineItemsBlock as BlockComponent },
  "order-summary": { component: OrderSummaryBlock as BlockComponent },
  "price-tiers": { component: PriceTiersBlock as BlockComponent },

  // Marketing
  "announcement-bar": { component: AnnouncementBarBlock as BlockComponent },
  "collection-cards": { component: CollectionCardsBlock as BlockComponent },
  "trust-strip": { component: TrustStripBlock as BlockComponent },
  "story-split": { component: StorySplitBlock as BlockComponent },
  "bento-showcase": { component: BentoShowcaseBlock as BlockComponent },
  "stats-band": { component: StatsBandBlock as BlockComponent },
  newsletter: { component: NewsletterBlock as BlockComponent },
  "contact-block": { component: ContactBlockComp as BlockComponent },
  faq: { component: FaqBlock as BlockComponent },
  testimonials: { component: TestimonialsBlock as BlockComponent },
  "logo-cloud": { component: LogoCloudBlock as BlockComponent },
  "policy-strip": { component: PolicyStripBlock as BlockComponent },

  // Blog
  "blog-list": { component: BlogListBlock as BlockComponent },

  // PDP
  "pdp-gallery": { component: PdpGalleryBlock as BlockComponent },
  "pdp-buybox": { component: PdpBuyboxBlock as BlockComponent },
  "pdp-details": { component: PdpDetailsBlock as BlockComponent },
  "pdp-related": { component: PdpRelatedBlock as BlockComponent },
  "reviews-list": { component: ReviewsListBlock as BlockComponent },
  fbt: { component: FbtBlock as BlockComponent },
  "recently-viewed": { component: RecentlyViewedBlock as BlockComponent },
  "size-guide": { component: SizeGuideBlock as BlockComponent },
  "product-comparison": { component: ProductComparisonBlock as BlockComponent },
  lookbook: { component: LookbookBlock as BlockComponent },

  // Header
  "nav-bar": { component: NavBarBlock as BlockComponent },
  "logo-mark": { component: LogoMarkBlock as BlockComponent },
  "utility-bar": { component: UtilityBarBlock as BlockComponent },

  // Footer
  "footer-columns": { component: FooterColumnsBlock as BlockComponent },
  "social-links": { component: SocialLinksBlock as BlockComponent },
  "payment-icons": { component: PaymentIconsBlock as BlockComponent },
  "copyright-bar": { component: CopyrightBarBlock as BlockComponent },

  // Checkout
  "account-bar": { component: AccountBarBlock as BlockComponent },
  "checkout-form": { component: CheckoutFormBlock as BlockComponent },

  // Reusable sub-trees
  "snippet-ref": { component: SnippetRefBlock as BlockComponent },

  // Forms
  form: { component: FormBlock as BlockComponent },
};

export type {
  BlockComponentProps,
  BlockComponent,
  BlockDataContext,
  BlockRegistryEntry,
} from "./types";
