/**
 * Block schema — atoms of the tenant-site renderer.
 *
 * Adding a block kind = (1) add an entry to BlockPropsMap, (2) add the
 * matching Zod schema to BlockPropsSchemas, (3) register a React component
 * in apps/tenant-site/components/blocks/registry.ts.
 *
 * Forward-compat: unknown kinds pass through the parser so older renderers
 * keep working on newer layouts.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Structural types shared across blocks
// ---------------------------------------------------------------------------

export interface BlockStyleOverride {
  backgroundToken?: string;
  textToken?: string;
  paddingY?: "none" | "compact" | "balanced" | "spacious";
  maxWidth?: "narrow" | "default" | "wide" | "full";
  alignment?: "start" | "center" | "end";
}

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
}

export interface HeadingProps {
  text: string;
  level: 1 | 2 | 3 | 4;
  alignment?: "start" | "center" | "end";
  eyebrow?: string;
  subtitle?: string;
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
}

export interface ButtonProps {
  label: string;
  href: string;
  style: "primary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  alignment?: "start" | "center" | "end";
}

export interface SpacerProps {
  size: "xs" | "sm" | "md" | "lg" | "xl";
}

export interface DividerProps {
  variant?: "line" | "dotted" | "dashed";
  inset?: boolean;
}

export interface MarkdownBodyProps {
  source: string;
  maxWidth?: "narrow" | "default" | "wide";
}

// Commerce -------------------------------------------------------------------

export interface HeroProps {
  variant: "minimal" | "standard" | "luxury" | "boutique" | "editorial";
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export interface ProductGridProps {
  source: "featured" | "category" | "manual";
  categoryId?: string;
  productIds?: string[];
  limit: number;
  columns: 2 | 3 | 4 | 5;
  cardVariant: "bordered" | "bare" | "card";
  heading?: string;
  eyebrow?: string;
}

export interface CategoryTilesProps {
  heading?: string;
  columns: 2 | 3 | 4;
  aspectRatio?: "1/1" | "4/5" | "3/4" | "16/9";
}

export interface ProductListingProps {
  pageSize: number;
  defaultSort: "newest" | "price-asc" | "price-desc" | "name-asc";
  showSort: boolean;
  columns: 2 | 3 | 4;
  categoryFilter: boolean;
}

// Marketing ------------------------------------------------------------------

export interface TrustStripProps {
  items: { label: string; value: string }[];
  dark?: boolean;
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
}

export interface BentoShowcaseProps {
  heading?: string;
  eyebrow?: string;
  source: "featured" | "manual";
  productIds?: string[];
  limit: number;
}

export interface StatsBandProps {
  items: { value: string; label: string }[];
  dark?: boolean;
}

export interface NewsletterProps {
  title?: string;
  subtitle?: string;
  cta?: string;
}

export interface ContactBlockProps {
  heading?: string;
}

export interface FaqProps {
  heading?: string;
  items: { question: string; answer: string }[];
}

export interface TestimonialsProps {
  heading?: string;
  items: { quote: string; author: string; role?: string }[];
}

export interface LogoCloudProps {
  heading?: string;
  logos: { src: string; alt: string }[];
}

// Blog -----------------------------------------------------------------------

export interface BlogListProps {
  heading?: string;
  limit: number;
  columns: 2 | 3 | 4;
}

// Product Detail -------------------------------------------------------------

export interface PdpGalleryProps {
  layout: "thumbs-below" | "thumbs-left" | "stacked";
  enableZoom: boolean;
}

export interface PdpBuyboxProps {
  showSku?: boolean;
  showCategory?: boolean;
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

// Layer 2 blocks ---------------------------------------------------------------

export interface EmbedProps {
  src: string;
  aspectRatio?: "16/9" | "4/3" | "1/1" | "auto";
  allowFullscreen?: boolean;
  caption?: string;
}

export interface VideoProps {
  source: "youtube" | "vimeo" | "mp4";
  url: string;
  aspectRatio?: "16/9" | "4/3" | "1/1";
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  caption?: string;
}

export interface AccordionProps {
  items: { title: string; body: string }[];
  allowMultiple?: boolean;
  heading?: string;
}

export interface ColumnsProps {
  count: 2 | 3 | 4;
  gap?: "sm" | "md" | "lg";
  verticalAlign?: "start" | "center" | "end";
}

export interface GalleryProps {
  images: { src: string; alt: string; caption?: string }[];
  layout: "grid" | "masonry" | "slideshow";
  columns: 2 | 3 | 4;
  lightbox?: boolean;
  aspectRatio?: "1/1" | "4/3" | "3/4" | "16/9" | "auto";
}

export interface TabsProps {
  tabs: { label: string; content: string }[];
  defaultTab?: number;
}

export interface FormFieldDef {
  kind: "text" | "email" | "textarea" | "phone" | "select";
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

export interface FormBlockProps {
  heading?: string;
  description?: string;
  fields: FormFieldDef[];
  submitLabel?: string;
  successMessage?: string;
  submitTo: "email" | "crm-lead";
}

export interface CssGridProps {
  /** Number of columns (1–12). */
  columns: number;
  gap?: "sm" | "md" | "lg";
  minRowHeight?: string;
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
  "trust-strip": TrustStripProps;
  "story-split": StorySplitProps;
  "bento-showcase": BentoShowcaseProps;
  "stats-band": StatsBandProps;
  newsletter: NewsletterProps;
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
  breadcrumbs: BreadcrumbsProps;
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

export const BlockStyleOverrideSchema: z.ZodType<BlockStyleOverride> = z
  .object({
    backgroundToken: z.string().max(80).optional(),
    textToken: z.string().max(80).optional(),
    paddingY: z.enum(["none", "compact", "balanced", "spacious"]).optional(),
    maxWidth: z.enum(["narrow", "default", "wide", "full"]).optional(),
    alignment: z.enum(["start", "center", "end"]).optional(),
  })
  .strict();

export const BlockVisibilitySchema: z.ZodType<BlockVisibility> = z
  .object({
    mobile: z.boolean().optional(),
    tablet: z.boolean().optional(),
    desktop: z.boolean().optional(),
  })
  .strict();

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

export const BlockPropsSchemas = {
  section: z
    .object({
      background: z
        .enum(["default", "surface", "accent", "inverted"])
        .optional(),
      paddingY: z.enum(["none", "compact", "balanced", "spacious"]).optional(),
      maxWidth: z.enum(["narrow", "default", "wide", "full"]).optional(),
    })
    .strict(),
  heading: z
    .object({
      text: str(300),
      level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
      alignment: z.enum(["start", "center", "end"]).optional(),
      eyebrow: optStr(100),
      subtitle: optStr(400),
    })
    .strict(),
  "rich-text": z
    .object({
      source: z.string().min(1).max(100_000),
      maxWidth: z.enum(["narrow", "default", "wide"]).optional(),
      alignment: z.enum(["start", "center"]).optional(),
    })
    .strict(),
  image: z
    .object({
      src: str(1000),
      alt: str(200),
      aspectRatio: z.enum(["1/1", "4/3", "16/9", "3/4", "auto"]).optional(),
      rounded: z.boolean().optional(),
      caption: optStr(300),
      link: optStr(1000),
    })
    .strict(),
  button: z
    .object({
      label: str(80),
      href: str(1000),
      style: z.enum(["primary", "outline", "ghost"]),
      size: z.enum(["sm", "md", "lg"]).optional(),
      alignment: z.enum(["start", "center", "end"]).optional(),
    })
    .strict(),
  spacer: z.object({ size: z.enum(["xs", "sm", "md", "lg", "xl"]) }).strict(),
  divider: z
    .object({
      variant: z.enum(["line", "dotted", "dashed"]).optional(),
      inset: z.boolean().optional(),
    })
    .strict(),
  "markdown-body": z
    .object({
      source: z.string().min(1).max(200_000),
      maxWidth: z.enum(["narrow", "default", "wide"]).optional(),
    })
    .strict(),
  hero: z
    .object({
      variant: z.enum([
        "minimal",
        "standard",
        "luxury",
        "boutique",
        "editorial",
      ]),
      title: optStr(200),
      subtitle: optStr(400),
      ctaLabel: optStr(60),
      ctaHref: optStr(1000),
    })
    .strict(),
  "product-grid": z
    .object({
      source: z.enum(["featured", "category", "manual"]),
      categoryId: optStr(80),
      productIds: z.array(z.string().max(80)).max(50).optional(),
      limit: z.number().int().min(1).max(50),
      columns: z.union([
        z.literal(2),
        z.literal(3),
        z.literal(4),
        z.literal(5),
      ]),
      cardVariant: z.enum(["bordered", "bare", "card"]),
      heading: optStr(200),
      eyebrow: optStr(100),
    })
    .strict(),
  "category-tiles": z
    .object({
      heading: optStr(200),
      columns: z.union([z.literal(2), z.literal(3), z.literal(4)]),
      aspectRatio: z.enum(["1/1", "4/5", "3/4", "16/9"]).optional(),
    })
    .strict(),
  "product-listing": z
    .object({
      pageSize: z.number().int().min(1).max(100),
      defaultSort: z.enum(["newest", "price-asc", "price-desc", "name-asc"]),
      showSort: z.boolean(),
      columns: z.union([z.literal(2), z.literal(3), z.literal(4)]),
      categoryFilter: z.boolean(),
    })
    .strict(),
  "trust-strip": z
    .object({
      items: z
        .array(z.object({ label: str(80), value: str(80) }).strict())
        .max(10),
      dark: z.boolean().optional(),
    })
    .strict(),
  "story-split": z
    .object({
      eyebrow: optStr(80),
      title: str(200),
      body: z.string().max(2000),
      imageSide: z.enum(["left", "right"]),
      imageUrl: optStr(1000),
      imageCaption: optStr(200),
      ctaHref: optStr(1000),
      ctaLabel: optStr(60),
    })
    .strict(),
  "bento-showcase": z
    .object({
      heading: optStr(200),
      eyebrow: optStr(100),
      source: z.enum(["featured", "manual"]),
      productIds: z.array(z.string().max(80)).max(10).optional(),
      limit: z.number().int().min(1).max(10),
    })
    .strict(),
  "stats-band": z
    .object({
      items: z
        .array(z.object({ value: str(40), label: str(80) }).strict())
        .max(10),
      dark: z.boolean().optional(),
    })
    .strict(),
  newsletter: z
    .object({
      title: optStr(200),
      subtitle: optStr(400),
      cta: optStr(40),
    })
    .strict(),
  "contact-block": z.object({ heading: optStr(200) }).strict(),
  faq: z
    .object({
      heading: optStr(200),
      items: z
        .array(
          z
            .object({
              question: str(300),
              answer: z.string().max(3000),
            })
            .strict(),
        )
        .max(50),
    })
    .strict(),
  testimonials: z
    .object({
      heading: optStr(200),
      items: z
        .array(
          z
            .object({
              quote: z.string().max(1000),
              author: str(100),
              role: optStr(100),
            })
            .strict(),
        )
        .max(20),
    })
    .strict(),
  "logo-cloud": z
    .object({
      heading: optStr(200),
      logos: z
        .array(z.object({ src: str(1000), alt: str(200) }).strict())
        .max(24),
    })
    .strict(),
  "blog-list": z
    .object({
      heading: optStr(200),
      limit: z.number().int().min(1).max(24),
      columns: z.union([z.literal(2), z.literal(3), z.literal(4)]),
    })
    .strict(),
  "pdp-gallery": z
    .object({
      layout: z.enum(["thumbs-below", "thumbs-left", "stacked"]),
      enableZoom: z.boolean(),
    })
    .strict(),
  "pdp-buybox": z
    .object({
      showSku: z.boolean().optional(),
      showCategory: z.boolean().optional(),
    })
    .strict(),
  "pdp-details": z.object({ tabs: z.boolean().optional() }).strict(),
  "pdp-related": z
    .object({
      heading: optStr(200),
      limit: z.number().int().min(1).max(12),
      columns: z.union([z.literal(2), z.literal(3), z.literal(4)]),
    })
    .strict(),
  breadcrumbs: z
    .object({ scope: z.enum(["product", "category", "page"]) })
    .strict(),
  // Layer 2
  embed: z
    .object({
      src: str(2000),
      aspectRatio: z.enum(["16/9", "4/3", "1/1", "auto"]).optional(),
      allowFullscreen: z.boolean().optional(),
      caption: optStr(300),
    })
    .strict(),
  video: z
    .object({
      source: z.enum(["youtube", "vimeo", "mp4"]),
      url: str(2000),
      aspectRatio: z.enum(["16/9", "4/3", "1/1"]).optional(),
      autoplay: z.boolean().optional(),
      loop: z.boolean().optional(),
      muted: z.boolean().optional(),
      caption: optStr(300),
    })
    .strict(),
  accordion: z
    .object({
      items: z
        .array(
          z
            .object({
              title: str(300),
              body: z.string().max(5000),
            })
            .strict(),
        )
        .max(50),
      allowMultiple: z.boolean().optional(),
      heading: optStr(200),
    })
    .strict(),
  columns: z
    .object({
      count: z.union([z.literal(2), z.literal(3), z.literal(4)]),
      gap: z.enum(["sm", "md", "lg"]).optional(),
      verticalAlign: z.enum(["start", "center", "end"]).optional(),
    })
    .strict(),
  gallery: z
    .object({
      images: z
        .array(
          z
            .object({
              src: str(2000),
              alt: str(200),
              caption: optStr(300),
            })
            .strict(),
        )
        .max(50),
      layout: z.enum(["grid", "masonry", "slideshow"]),
      columns: z.union([z.literal(2), z.literal(3), z.literal(4)]),
      lightbox: z.boolean().optional(),
      aspectRatio: z.enum(["1/1", "4/3", "3/4", "16/9", "auto"]).optional(),
    })
    .strict(),
  tabs: z
    .object({
      tabs: z
        .array(
          z
            .object({
              label: str(100),
              content: z.string().max(50_000),
            })
            .strict(),
        )
        .max(20),
      defaultTab: z.number().int().min(0).optional(),
    })
    .strict(),
  form: z
    .object({
      heading: optStr(200),
      description: optStr(500),
      fields: z
        .array(
          z
            .object({
              kind: z.enum(["text", "email", "textarea", "phone", "select"]),
              label: str(100),
              required: z.boolean().optional(),
              placeholder: optStr(200),
              options: z.array(z.string().max(100)).max(50).optional(),
            })
            .strict(),
        )
        .max(30),
      submitLabel: optStr(60),
      successMessage: optStr(500),
      submitTo: z.enum(["email", "crm-lead"]),
    })
    .strict(),
  // Layer 3
  "css-grid": z
    .object({
      columns: z.number().int().min(1).max(12),
      gap: z.enum(["sm", "md", "lg"]).optional(),
      minRowHeight: z.string().max(20).optional(),
    })
    .strict(),
} satisfies Record<BlockKind, z.ZodType<unknown>>;

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
  "blog-index",
  "blog-post",
  "page",
  "404",
  "landing",
] as const;

export type SiteLayoutScope = (typeof SITE_LAYOUT_SCOPES)[number];

export const SiteLayoutScopeSchema = z.enum(SITE_LAYOUT_SCOPES);
