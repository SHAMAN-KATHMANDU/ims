// Content / layout blocks
import { SectionBlock } from "./components/layout/SectionBlock";
import { RowBlock } from "./components/layout/RowBlock";
import { ColumnsBlock } from "./components/layout/ColumnsBlock";
import { CssGridBlock } from "./components/layout/CssGridBlock";
// Content blocks
import { HeadingBlock, RichTextBlock, ImageBlock, ButtonBlock, SpacerBlock, DividerBlock, } from "./components/content/ContentBlocks";
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
// Reusable sub-trees
import { SnippetRefBlock } from "./components/SnippetRefBlock";
// Form blocks
import { FormBlock } from "./components/content/FormBlock";
export const blockRegistry = {
    // Layout
    section: { component: SectionBlock, container: true },
    row: { component: RowBlock, container: true },
    columns: { component: ColumnsBlock, container: true },
    "css-grid": { component: CssGridBlock, container: true },
    // Content
    heading: { component: HeadingBlock },
    "rich-text": { component: RichTextBlock },
    image: { component: ImageBlock },
    button: { component: ButtonBlock },
    spacer: { component: SpacerBlock },
    divider: { component: DividerBlock },
    "markdown-body": { component: MarkdownBodyBlock },
    embed: { component: EmbedBlock },
    video: { component: VideoBlock },
    accordion: { component: AccordionBlock },
    gallery: { component: GalleryBlock },
    tabs: { component: TabsBlock },
    "custom-html": { component: CustomHtmlBlock },
    "empty-state": { component: EmptyStateBlock },
    breadcrumbs: { component: BreadcrumbsBlock },
    // Commerce
    hero: { component: HeroBlock },
    "product-grid": { component: ProductGridBlock },
    "category-tiles": { component: CategoryTilesBlock },
    "product-listing": { component: ProductListingBlock },
    "product-filters": { component: ProductFiltersBlock },
    "bundle-spotlight": { component: BundleSpotlightBlock },
    "gift-card-redeem": { component: GiftCardRedeemBlock },
    "cart-line-items": { component: CartLineItemsBlock },
    "order-summary": { component: OrderSummaryBlock },
    "price-tiers": { component: PriceTiersBlock },
    // Marketing
    "announcement-bar": { component: AnnouncementBarBlock },
    "collection-cards": { component: CollectionCardsBlock },
    "trust-strip": { component: TrustStripBlock },
    "story-split": { component: StorySplitBlock },
    "bento-showcase": { component: BentoShowcaseBlock },
    "stats-band": { component: StatsBandBlock },
    newsletter: { component: NewsletterBlock },
    "contact-block": { component: ContactBlockComp },
    faq: { component: FaqBlock },
    testimonials: { component: TestimonialsBlock },
    "logo-cloud": { component: LogoCloudBlock },
    "policy-strip": { component: PolicyStripBlock },
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
    // Header
    "nav-bar": { component: NavBarBlock },
    "logo-mark": { component: LogoMarkBlock },
    "utility-bar": { component: UtilityBarBlock },
    // Footer
    "footer-columns": { component: FooterColumnsBlock },
    "social-links": { component: SocialLinksBlock },
    "payment-icons": { component: PaymentIconsBlock },
    "copyright-bar": { component: CopyrightBarBlock },
    // Checkout
    "account-bar": { component: AccountBarBlock },
    // Reusable sub-trees
    "snippet-ref": { component: SnippetRefBlock },
    // Forms
    form: { component: FormBlock },
};
