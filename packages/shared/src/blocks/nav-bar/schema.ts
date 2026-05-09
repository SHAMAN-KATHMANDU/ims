import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Nav item with optional children for dropdowns and mega-menu sub-trees.
 * Recursive structure supports unlimited nesting (though renderers typically limit to 2-3 levels).
 * megaMenuBlocks is a BlockNode[] but typed as `any[]` here to avoid circular import.
 */
export interface NavBarItem {
  label: string;
  href: string;
  children?: NavBarItem[];
  megaMenuBlocks?: unknown[]; // BlockNode[] — validated at site-layout level
  hasMegaMenu?: boolean;
}

/**
 * Brand can be either a simple string (legacy) or an object with logo/style.
 */
export type NavBarBrand =
  | string
  | {
      text?: string;
      logoAssetId?: string;
      href?: string;
      style?: "serif" | "sans" | "mono";
    };

/**
 * Optional CTA button at the end of the nav.
 */
export interface NavBarCta {
  label: string;
  href: string;
  style: "primary" | "outline" | "ghost";
}

/**
 * Optional utility bar (announcement + nav items) rendered in top bar.
 */
export interface NavBarUtilityBar {
  items?: NavBarItem[];
  announcement?: string;
}

/**
 * Optional mobile drawer (off-canvas menu).
 */
export interface NavBarMobileDrawer {
  items?: NavBarItem[];
  showSearch?: boolean;
  showAccount?: boolean;
}

/**
 * Nav bar — logo · menu · search · cart (header global).
 * Phase 2: enriched schema to be a true NavMenu superset.
 * All new fields are optional for backwards compatibility.
 */
export interface NavBarProps {
  brand: NavBarBrand;
  brandHref?: string;
  brandStyle?: "serif" | "sans" | "mono";
  items?: NavBarItem[];
  cta?: NavBarCta;
  utilityBar?: NavBarUtilityBar;
  mobileDrawer?: NavBarMobileDrawer;
  showSearch?: boolean;
  showCart?: boolean;
  showAccount?: boolean;
  cartCount?: number;
  sticky?: boolean;
  align?: "between" | "center";
}

/**
 * Zod schema for nav-bar props validation.
 * Supports recursive nav items and mega-menu sub-trees.
 * BlockNode[] is accepted as unknown and validated at the site-layout level.
 */
const NavBarItemSchema: z.ZodType<NavBarItem> = z.lazy(() =>
  z
    .object({
      label: str(100),
      href: str(500),
      children: z.array(NavBarItemSchema).optional(),
      megaMenuBlocks: z.any().optional(), // BlockNode[] — validated at site-layout level
      hasMegaMenu: z.boolean().optional(),
    })
    .strict(),
);

const NavBarBrandSchema = z.union([
  str(100),
  z
    .object({
      text: optStr(100),
      logoAssetId: z.string().uuid().optional(),
      href: optStr(500),
      style: z.enum(["serif", "sans", "mono"]).optional(),
    })
    .strict(),
]);

const NavBarCtaSchema = z
  .object({
    label: str(100),
    href: str(500),
    style: z.enum(["primary", "outline", "ghost"]),
  })
  .strict();

const NavBarUtilityBarSchema = z
  .object({
    items: z.array(NavBarItemSchema).optional(),
    announcement: optStr(500),
  })
  .strict();

const NavBarMobileDrawerSchema = z
  .object({
    items: z.array(NavBarItemSchema).optional(),
    showSearch: z.boolean().optional(),
    showAccount: z.boolean().optional(),
  })
  .strict();

export const NavBarSchema = z
  .object({
    brand: NavBarBrandSchema,
    brandHref: optStr(500),
    brandStyle: z.enum(["serif", "sans", "mono"]).optional(),
    items: z.array(NavBarItemSchema).optional(),
    cta: NavBarCtaSchema.optional(),
    utilityBar: NavBarUtilityBarSchema.optional(),
    mobileDrawer: NavBarMobileDrawerSchema.optional(),
    showSearch: z.boolean().optional(),
    showCart: z.boolean().optional(),
    showAccount: z.boolean().optional(),
    cartCount: z.number().int().nonnegative().optional(),
    sticky: z.boolean().optional(),
    align: z.enum(["between", "center"]).optional(),
  })
  .strict();

export type NavBarInput = z.infer<typeof NavBarSchema>;
