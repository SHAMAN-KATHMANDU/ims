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
// Block props map — one entry per kind
// ---------------------------------------------------------------------------

// Content / structural ------------------------------------------------------

export interface SectionProps {
  background?: "default" | "surface" | "accent" | "inverted";
  paddingY?: "none" | "compact" | "balanced" | "spacious";
  maxWidth?: "narrow" | "default" | "wide" | "full";
  backgroundImage?: string;
  backgroundOverlay?: "none" | "light" | "dark";
}

export interface HeadingProps {
  text: string;
  level: 1 | 2 | 3 | 4;
  alignment?: "start" | "center" | "end";
  eyebrow?: string;
  subtitle?: string;
  size?: "sm" | "md" | "lg" | "xl";
  decoration?: "none" | "underline" | "gradient";
}

export interface RichTextProps {
  source: string; // markdown
  maxWidth?: "narrow" | "default" | "wide";
  alignment?: "start" | "center";
}

export interface ImageProps {
  src: string;
  alt: string;
  aspectRatio?: "1/1" | "4/3" | "16/9" | "3/4" | "auto";
  rounded?: boolean;
  caption?: string;
  link?: string;
  shadow?: "none" | "sm" | "md" | "lg";
  hoverEffect?: "none" | "zoom" | "lift";
}

export interface ButtonProps {
  label: string;
  href: string;
  style: "primary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  alignment?: "start" | "center" | "end";
  fullWidth?: boolean;
}

export interface SpacerProps {
  size: "xs" | "sm" | "md" | "lg" | "xl";
  customPx?: number;
}

export interface DividerProps {
  variant?: "line" | "dotted" | "dashed";
  inset?: boolean;
  colorToken?: string;
}

export interface MarkdownBodyProps {
  source: string;
  maxWidth?: "narrow" | "default" | "wide";
}

// Commerce -------------------------------------------------------------------

export interface HeroProps {
  variant:
    | "minimal"
    | "standard"
    | "luxury"
    | "boutique"
    | "editorial"
    | "video"
    | "shoppable";
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  imageUrl?: string;
  heroLayout?: "centered" | "split-left" | "split-right" | "overlay";
  /** video variant only: mp4/webm source. Required when variant = "video". */
  videoUrl?: string;
  /** video variant only: poster image shown before playback. */
  videoPoster?: string;
  /**
   * shoppable variant only: product IDs to render as a compact shelf
   * beneath the hero copy. Order is preserved; unknown IDs skipped.
   */
  shoppableProductIds?: string[];
}

export interface ProductGridProps {
  source:
    | "featured"
    | "category"
    | "manual"
    | "newest"
    | "on-sale"
    | "price-low"
    | "price-high"
    | "collection"
    | "offers";
  categoryId?: string;
  productIds?: string[];
  /**
   * When `source === "collection"`, identifies which admin-curated
   * collection to pull from. Ignored for other sources.
   */
  collectionSlug?: string;
  limit: number;
  columns: 2 | 3 | 4 | 5;
  cardVariant: "bordered" | "bare" | "card";
  heading?: string;
  eyebrow?: string;
  showCategory?: boolean;
  showPrice?: boolean;
  showDiscount?: boolean;
  cardAspectRatio?: "1/1" | "3/4" | "4/5" | "16/9";
  /**
   * Grid (default) keeps the existing N-column layout. Carousel
   * switches to a horizontally scrolling row with scroll-snap and
   * prev/next controls — matches the "Featured / Exclusives / Top
   * Picks" carousels on reference designs.
   */
  layout?: "grid" | "carousel";
  /**
   * Optional "View more" link (e.g. /offers, /collections/exclusives).
   * Rendered as a small button under the carousel/grid.
   */
  viewMoreHref?: string;
  viewMoreLabel?: string;
}

export interface CategoryTilesProps {
  heading?: string;
  columns: 2 | 3 | 4;
  aspectRatio?: "1/1" | "4/5" | "3/4" | "16/9";
  showProductCount?: boolean;
  cardStyle?: "overlay" | "below";
}

export interface ProductListingProps {
  pageSize: number;
  defaultSort: "newest" | "price-asc" | "price-desc" | "name-asc";
  showSort: boolean;
  columns: 2 | 3 | 4;
  categoryFilter: boolean;
  showCategory?: boolean;
  showPrice?: boolean;
  showDiscount?: boolean;
  cardAspectRatio?: "1/1" | "3/4" | "4/5" | "16/9";
}

// Marketing ------------------------------------------------------------------

export interface AnnouncementBarProps {
  text: string;
  link?: string;
  marquee: boolean;
  tone?: "default" | "muted" | "accent";
  /**
   * Optional repeating strip of short claims (e.g. "Across Qatar ·
   * Exclusive Brands · Scheduled Delivery"). When non-empty, `items`
   * takes precedence over `text` in the rendered marquee.
   */
  items?: string[];
  /**
   * Presentation: "bar" (default) renders as a top strip; "modal"
   * renders as a dismissible promo popup with a larger CTA. Modal
   * dismissal is persisted in localStorage.
   */
  mode?: "bar" | "modal";
  /** Modal-only: seconds before auto-open (0 = immediate). */
  modalDelaySeconds?: number;
  /** Modal-only: button label (falls back to "Shop now"). */
  modalCtaLabel?: string;
  /** Modal-only: optional heading shown above `text`. */
  modalHeading?: string;
}

export interface CollectionCardItem {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export interface CollectionCardsProps {
  heading?: string;
  eyebrow?: string;
  /** 2–4 cards. Each card links to a collection, category, or landing. */
  cards: CollectionCardItem[];
  aspectRatio?: "square" | "portrait" | "landscape";
  overlay?: boolean;
}

export interface ProductFiltersProps {
  heading?: string;
  show: {
    category: boolean;
    priceRange: boolean;
    brand: boolean;
    /**
     * Attribute-type IDs whose facets should render. Empty = show every
     * attribute returned in the facet payload.
     */
    attributes?: string[];
  };
  /**
   * Sticky offset in pixels when the sidebar is nested in a columns
   * container. Default: 96 (below the tenant header). `0` disables stick.
   */
  stickyOffset?: number;
}

export interface TrustStripProps {
  items: { label: string; value: string }[];
  dark?: boolean;
  layout?: "inline" | "grid";
  columns?: 2 | 3 | 4 | 5;
}

export interface StorySplitProps {
  eyebrow?: string;
  title: string;
  body: string;
  imageSide: "left" | "right";
  imageUrl?: string;
  imageCaption?: string;
  ctaHref?: string;
  ctaLabel?: string;
  mediaType?: "image" | "video";
  videoUrl?: string;
}

export interface BentoShowcaseProps {
  heading?: string;
  eyebrow?: string;
  source: "featured" | "manual";
  productIds?: string[];
  limit: number;
  columns?: 2 | 3 | 4;
  cardVariant?: "bordered" | "bare" | "card";
  showPrice?: boolean;
}

export interface StatsBandProps {
  items: { value: string; label: string }[];
  dark?: boolean;
  alignment?: "start" | "center" | "end";
  valueSize?: "sm" | "md" | "lg" | "xl";
}

export interface NewsletterProps {
  title?: string;
  subtitle?: string;
  cta?: string;
  variant?: "inline" | "card" | "banner" | "modal";
  dark?: boolean;
  /** Modal-only: seconds before first auto-open (0 disables auto-open). */
  modalDelaySeconds?: number;
  /** Modal-only: show on exit-intent (desktop). */
  modalExitIntent?: boolean;
}

export interface PolicyItem {
  label: string;
  detail?: string;
  icon?: "shipping" | "returns" | "secure" | "support" | "warranty" | "gift";
  href?: string;
}

export interface PolicyStripProps {
  heading?: string;
  items: PolicyItem[];
  layout?: "inline" | "grid";
  columns?: 2 | 3 | 4;
  dark?: boolean;
}

export interface ContactBlockProps {
  heading?: string;
  layout?: "centered" | "split";
  showMap?: boolean;
  showSocials?: boolean;
}

export interface FaqProps {
  heading?: string;
  items: { question: string; answer: string }[];
  variant?: "bordered" | "minimal" | "card";
}

export interface TestimonialsProps {
  heading?: string;
  items: { quote: string; author: string; role?: string }[];
  layout?: "grid" | "carousel" | "stacked";
  columns?: 2 | 3;
  showAvatar?: boolean;
}

export interface LogoCloudProps {
  heading?: string;
  logos: { src: string; alt: string }[];
  logoHeight?: number;
  grayscale?: boolean;
  columns?: 3 | 4 | 5 | 6;
}

// Blog -----------------------------------------------------------------------

export interface BlogListProps {
  heading?: string;
  limit: number;
  columns: 2 | 3 | 4;
  cardVariant?: "default" | "minimal" | "card";
  showExcerpt?: boolean;
  showDate?: boolean;
  showCategory?: boolean;
  showImage?: boolean;
}

// Product Detail -------------------------------------------------------------

export interface PdpGalleryProps {
  layout: "thumbs-below" | "thumbs-left" | "stacked";
  enableZoom: boolean;
  aspectRatio?: "1/1" | "3/4" | "4/5" | "16/9";
}

export interface PdpBuyboxProps {
  showSku?: boolean;
  showCategory?: boolean;
  showAddToCart?: boolean;
  showDescription?: boolean;
  priceSize?: "sm" | "md" | "lg";
  /**
   * Render attribute-grouped chips (or a dropdown) for products with
   * multiple active variations. Default: true — variants hide on
   * single-variation products automatically.
   */
  showVariantPicker?: boolean;
  variantDisplay?: "chips" | "dropdown";
}

export interface PdpDetailsProps {
  tabs?: boolean;
}

export interface PdpRelatedProps {
  heading?: string;
  limit: number;
  columns: 2 | 3 | 4;
}

export interface BreadcrumbsProps {
  scope: "product" | "category" | "page";
}

export interface ProductComparisonProps {
  heading?: string;
  description?: string;
  /** Explicit product IDs to render as columns (2–4). */
  productIds: string[];
  /**
   * Which attribute rows to include. Defaults to the common set when
   * omitted. Values match PublicProduct fields + a few synthetic ones
   * ("price", "rating") resolved by the block.
   */
  attributes?: (
    | "price"
    | "category"
    | "rating"
    | "length"
    | "breadth"
    | "height"
    | "weight"
    | "description"
  )[];
}

export interface LookbookPin {
  /**
   * Normalized coordinates 0–1 for both axes so the pin stays anchored
   * on any aspect ratio.
   */
  x: number;
  y: number;
  productId: string;
  label?: string;
}

export interface LookbookScene {
  imageUrl: string;
  alt?: string;
  caption?: string;
  pins: LookbookPin[];
}

export interface LookbookProps {
  heading?: string;
  description?: string;
  scenes: LookbookScene[];
  aspectRatio?: "16/9" | "4/5" | "3/4" | "1/1";
}

export interface SizeGuideRow {
  label: string;
  values: string[];
}

export interface SizeGuideProps {
  triggerLabel?: string;
  heading?: string;
  description?: string;
  /** Column headers for the size table (e.g. ["S", "M", "L", "XL"]). */
  columns: string[];
  /** Rows e.g. [{ label: "Chest (cm)", values: ["86", "91", "96", "101"] }]. */
  rows: SizeGuideRow[];
  note?: string;
  /**
   * Render variant. `inline` drops the table straight into the page;
   * `modal` hides it behind a trigger button that opens a dialog.
   */
  variant?: "inline" | "modal";
}

export interface RecentlyViewedProps {
  heading?: string;
  limit?: number;
  columns?: 2 | 3 | 4;
  cardVariant?: "bordered" | "bare" | "card";
  /**
   * Hide the block entirely when the shopper has no recently-viewed
   * history yet. When false, renders an empty placeholder heading (rare
   * use — typically want `true`).
   */
  hideWhenEmpty?: boolean;
  /**
   * When mounted on a PDP, skip the currently-viewed product so the
   * strip only shows other items. Defaults to true.
   */
  excludeCurrent?: boolean;
}

export interface FbtProps {
  heading?: string;
  /**
   * Source of the anchor product. `current-pdp` reads activeProduct;
   * `explicit` uses productId.
   */
  productIdSource?: "current-pdp" | "explicit";
  productId?: string;
  limit?: number;
  columns?: 2 | 3 | 4;
  cardVariant?: "bordered" | "bare" | "card";
}

export interface ReviewsListProps {
  heading?: string;
  /**
   * Where the product id comes from. `current-pdp` uses the active
   * product on the page; `explicit` requires `productId`. Defaults to
   * `current-pdp` so the block is drop-in on PDP blueprints.
   */
  productIdSource?: "current-pdp" | "explicit";
  productId?: string;
  pageSize?: number;
  emptyMessage?: string;
  showRatingSummary?: boolean;
}

// Layer 2 blocks ---------------------------------------------------------------

export interface EmbedProps {
  src: string;
  aspectRatio?: "16/9" | "4/3" | "1/1" | "auto";
  allowFullscreen?: boolean;
  caption?: string;
  title?: string;
  height?: number;
}

export interface VideoProps {
  source: "youtube" | "vimeo" | "mp4";
  url: string;
  aspectRatio?: "16/9" | "4/3" | "1/1";
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  caption?: string;
  posterUrl?: string;
  rounded?: boolean;
}

export interface AccordionProps {
  items: { title: string; body: string }[];
  allowMultiple?: boolean;
  heading?: string;
  icon?: "chevron" | "plus" | "arrow";
  variant?: "bordered" | "minimal" | "card";
}

export interface ColumnsProps {
  count: 2 | 3 | 4;
  gap?: "sm" | "md" | "lg";
  verticalAlign?: "start" | "center" | "end";
  stackBelow?: "sm" | "md" | "lg";
  /**
   * When true, the first child becomes `position: sticky` at the viewport
   * top (with a small offset) on breakpoints where the grid is active.
   * Matches the standard PDP gallery-on-left pattern.
   */
  stickyFirst?: boolean;
}

export interface GalleryProps {
  images: { src: string; alt: string; caption?: string }[];
  layout: "grid" | "masonry" | "slideshow";
  columns: 2 | 3 | 4;
  lightbox?: boolean;
  aspectRatio?: "1/1" | "4/3" | "3/4" | "16/9" | "auto";
  gap?: "sm" | "md" | "lg";
  hoverEffect?: "none" | "zoom" | "caption";
  rounded?: boolean;
}

export interface TabsProps {
  tabs: { label: string; content: string }[];
  defaultTab?: number;
  variant?: "underline" | "pills" | "bordered";
  alignment?: "start" | "center";
}

export interface FormFieldDef {
  kind: "text" | "email" | "textarea" | "phone" | "select";
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  width?: "full" | "half";
}

export interface FormBlockProps {
  heading?: string;
  description?: string;
  fields: FormFieldDef[];
  submitLabel?: string;
  successMessage?: string;
  submitTo: "email" | "crm-lead";
  layout?: "stacked" | "inline";
  buttonStyle?: "primary" | "outline" | "ghost";
  buttonAlignment?: "start" | "center" | "stretch";
}

export interface CssGridProps {
  /** Number of columns (1–12). */
  columns: number;
  gap?: "sm" | "md" | "lg";
  minRowHeight?: string;
  mobileColumns?: number;
  tabletColumns?: number;
}

// Commerce (bundles + gift cards) -------------------------------------------

export interface BundleSpotlightProps {
  /** Published bundle slug (required — the block fetches by slug). */
  slug: string;
  /** Override the heading. When omitted, uses the bundle name. */
  heading?: string;
  /** Optional eyebrow label displayed above the heading. */
  eyebrow?: string;
  /** Description override. When omitted, uses the bundle's own description. */
  description?: string;
  /** Layout of media + copy. */
  layout?: "split" | "stacked";
  /** Show individual products included in the bundle (with names + prices). */
  showProducts?: boolean;
  /** CTA label under the pricing panel. */
  ctaLabel?: string;
  /** CTA href — defaults to the first included product's PDP. */
  ctaHref?: string;
  /** Visual style of the CTA. */
  buttonStyle?: "primary" | "outline" | "ghost";
}

export interface GiftCardRedeemProps {
  heading?: string;
  subtitle?: string;
  /** Label on the code input. */
  codeLabel?: string;
  /** Label on the amount input (redemption amount in minor units). */
  amountLabel?: string;
  /** Submit button label. */
  buttonLabel?: string;
  /** Message rendered after a successful redeem (supports {balance} token). */
  successMessage?: string;
  variant?: "inline" | "card";
}

// Utility -------------------------------------------------------------------

export interface EmptyStateProps {
  /** Preset that influences default copy / illustration. */
  kind?: "not-found" | "empty-search" | "empty-cart" | "generic";
  heading: string;
  subtitle?: string;
  illustration?: "none" | "package" | "magnifier" | "cart" | "alert";
  ctaLabel?: string;
  ctaHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

// Custom / advanced ---------------------------------------------------------

/** Flexible row container — lays out children in a horizontal flex row. */
export interface RowProps {
  gap?: "none" | "xs" | "sm" | "md" | "lg" | "xl";
  wrap?: boolean;
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
  align?: "start" | "center" | "end" | "stretch";
  reverse?: boolean;
}

/**
 * Custom HTML/CSS block.
 * Only accessible to authenticated tenant admins; rendered as-is on their own site.
 */
export interface CustomHtmlProps {
  /** Raw HTML markup inserted verbatim. */
  html: string;
  /** Optional scoped CSS injected in a <style> tag above the markup. */
  css?: string;
}

// Header blocks ---------------------------------------------------------------

export interface NavBarProps {
  brand: string;
  brandHref?: string;
  brandStyle?: "serif" | "sans" | "mono";
  items?: Array<{
    label: string;
    href: string;
    hasMegaMenu?: boolean;
  }>;
  showSearch?: boolean;
  showCart?: boolean;
  showAccount?: boolean;
  cartCount?: number;
  sticky?: boolean;
  align?: "between" | "center";
}

export interface LogoMarkProps {
  brand: string;
  href?: string;
  subtitle?: string;
  align?: "start" | "center" | "end";
  variant?: "text-only" | "with-icon";
}

export interface UtilityBarProps {
  items?: Array<{
    label: string;
    href: string;
  }>;
  align?: "start" | "center" | "end" | "between";
}

// Footer blocks ---------------------------------------------------------------

export interface FooterColumnsProps {
  showBrand?: boolean;
  brand?: string;
  tagline?: string;
  columns?: Array<{
    title: string;
    links?: Array<{
      label: string;
      href: string;
    }>;
  }>;
}

export interface SocialLinksProps {
  items?: Array<{
    platform: string;
    handle?: string;
    href: string;
  }>;
  variant?: "text" | "icons-only" | "icons-pill";
  align?: "start" | "center" | "end";
}

export interface PaymentIconsProps {
  items?: Array<{
    name: string;
  }>;
  variant?: "flat" | "outlined";
  align?: "start" | "center" | "end";
}

export interface CopyrightBarProps {
  copy: string;
  showLinks?: boolean;
  items?: Array<{
    label: string;
    href: string;
  }>;
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
