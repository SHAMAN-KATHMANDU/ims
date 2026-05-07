/**
 * Footer schema — full FooterConfig stored in `nav_menus` under the
 * `footer-config` slot. Drives the tenant-site renderer and the Site →
 * Footer admin editor.
 *
 * The `footer-1` and `footer-2` slots remain (NavItemsOnly column links) for
 * backwards compatibility with existing tenants. When `footer-config` is
 * present it takes precedence; when absent, the legacy footer-1/footer-2
 * columns + hardcoded SocialsRow are used.
 */

import { z } from "zod";
import { NavItemSchema, type NavItem } from "./nav";

const labelField = z.string().trim().min(1).max(80);
const hrefField = z.string().trim().min(1).max(500);

// ---------------------------------------------------------------------------
// Social networks (mirrors apps/tenant-site SocialKey + SOCIAL_META icon set)
// ---------------------------------------------------------------------------

export const SOCIAL_NETWORKS = [
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "x",
  "linkedin",
  "whatsapp",
] as const;

export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

export const SocialNetworkSchema = z.enum(SOCIAL_NETWORKS);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FooterLayout = "columns" | "centered" | "minimal" | "stacked";

export type FooterBackground = "default" | "muted" | "inverse";

export interface FooterColumn {
  heading: string;
  /**
   * NavItem array — same discriminated union the header uses, so footer
   * columns can include `pages-auto` / `category-auto` items that the
   * tenant-site renderer expands at request time against the current page
   * and category lists. Static `link` and `cta` items are also supported.
   * `dropdown` and `mega-column` kinds are valid in the type but the footer
   * renderer flattens them to a single column of links.
   */
  items: NavItem[];
}

export interface FooterSocial {
  network: SocialNetwork;
  href: string;
}

export interface FooterBrand {
  logoUrl?: string;
  logoAlt?: string;
  name?: string;
  tagline?: string;
}

export interface FooterNewsletter {
  enabled: boolean;
  heading?: string;
  placeholder?: string;
  buttonLabel?: string;
}

export interface FooterLegal {
  copyrightText?: string;
  showYear: boolean;
  links: Array<{ label: string; href: string }>;
}

export interface FooterConfig {
  layout: FooterLayout;
  background: FooterBackground;
  brand: FooterBrand;
  columns: FooterColumn[];
  socials: FooterSocial[];
  newsletter: FooterNewsletter;
  legal: FooterLegal;
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export const FooterColumnSchema: z.ZodType<FooterColumn> = z
  .object({
    heading: labelField,
    items: z.array(NavItemSchema).max(20),
  })
  .strict();

export const FooterSocialSchema: z.ZodType<FooterSocial> = z
  .object({
    network: SocialNetworkSchema,
    href: hrefField,
  })
  .strict();

export const FooterBrandSchema: z.ZodType<FooterBrand> = z
  .object({
    logoUrl: z.string().trim().min(1).max(1000).optional(),
    logoAlt: z.string().trim().min(1).max(120).optional(),
    name: z.string().trim().min(1).max(100).optional(),
    tagline: z.string().trim().min(1).max(280).optional(),
  })
  .strict();

export const FooterNewsletterSchema: z.ZodType<FooterNewsletter> = z
  .object({
    enabled: z.boolean(),
    heading: z.string().trim().min(1).max(120).optional(),
    placeholder: z.string().trim().min(1).max(120).optional(),
    buttonLabel: z.string().trim().min(1).max(40).optional(),
  })
  .strict();

export const FooterLegalSchema: z.ZodType<FooterLegal> = z
  .object({
    copyrightText: z.string().trim().min(1).max(200).optional(),
    showYear: z.boolean(),
    links: z
      .array(
        z
          .object({
            label: labelField,
            href: hrefField,
          })
          .strict(),
      )
      .max(10),
  })
  .strict();

export const FooterConfigSchema: z.ZodType<FooterConfig> = z
  .object({
    layout: z.enum(["columns", "centered", "minimal", "stacked"]),
    background: z.enum(["default", "muted", "inverse"]),
    brand: FooterBrandSchema,
    columns: z.array(FooterColumnSchema).max(6),
    socials: z.array(FooterSocialSchema).max(SOCIAL_NETWORKS.length),
    newsletter: FooterNewsletterSchema,
    legal: FooterLegalSchema,
  })
  .strict() as unknown as z.ZodType<FooterConfig>;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/**
 * Platform-wide default footer config. Mirrors the current hardcoded
 * SiteFooter shell so a tenant whose `footer-config` row is absent (or who
 * resets to defaults) sees the same footer they had before this slot existed.
 */
export function defaultFooterConfig(): FooterConfig {
  return {
    layout: "columns",
    background: "muted",
    brand: {},
    columns: [
      {
        heading: "Shop",
        items: [
          { kind: "link", label: "All products", href: "/products" },
          { kind: "link", label: "Journal", href: "/blog" },
          { kind: "link", label: "Contact", href: "/contact" },
        ],
      },
    ],
    socials: [],
    newsletter: {
      enabled: false,
      heading: "Stay in the loop",
      placeholder: "you@example.com",
      buttonLabel: "Subscribe",
    },
    legal: {
      showYear: true,
      links: [],
    },
  };
}
