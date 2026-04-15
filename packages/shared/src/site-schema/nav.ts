/**
 * Nav schema — NavItem graph + NavConfig for customizable headers, footers
 * and mobile drawers. Shared between API (validator/writer) and tenant-site
 * renderer (reader). The Phase 2 editor writes `NavConfig` rows into the
 * `nav_menus` table under stable slot keys:
 *   - "header-primary"   — main top navbar
 *   - "footer-1"         — footer column 1
 *   - "footer-2"         — footer column 2
 *   - "mobile-drawer"    — off-canvas mobile menu
 *
 * NavItem is recursive: dropdowns and mega-menus nest NavItems as children.
 * The renderer limits visual nesting to two levels (dropdown columns), but
 * the schema itself doesn't enforce a depth cap — keep it simple.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Slot keys
// ---------------------------------------------------------------------------

export const NAV_SLOTS = [
  "header-primary",
  "footer-1",
  "footer-2",
  "mobile-drawer",
] as const;

export type NavSlot = (typeof NAV_SLOTS)[number];

export const NavSlotSchema = z.enum(NAV_SLOTS);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NavCtaStyle = "primary" | "ghost" | "outline";

export type NavItem =
  | {
      kind: "link";
      label: string;
      href: string;
      openInNewTab?: boolean;
    }
  | {
      kind: "cta";
      label: string;
      href: string;
      style: NavCtaStyle;
    }
  | {
      kind: "dropdown";
      label: string;
      items: NavItem[];
    }
  | {
      kind: "mega-column";
      label: string;
      columns: { heading: string; items: NavItem[] }[];
    }
  /** Auto-expanded at render time from the live category list. */
  | {
      kind: "category-auto";
      label: string;
    }
  /** Auto-expanded from published TenantPages where showInNav=true. */
  | {
      kind: "pages-auto";
      label: string;
    };

export type NavHeaderLayout = "standard" | "centered" | "split" | "minimal";

export type NavHeaderBehavior =
  | "sticky"
  | "static"
  | "scroll-hide"
  | "transparent-on-hero";

export type NavMobileDrawerStyle = "slide-left" | "slide-right" | "fullscreen";

export interface NavConfig {
  /** Visual layout of the header row. */
  layout: NavHeaderLayout;
  /** Scroll/stick behavior of the header. */
  behavior: NavHeaderBehavior;
  /** Ordered list of nav items. */
  items: NavItem[];
  /** Optional trailing CTA button. */
  cta?: { label: string; href: string; style: NavCtaStyle };
  /** Mobile drawer config. */
  mobile: {
    drawerStyle: NavMobileDrawerStyle;
    showSearch: boolean;
  };
  showCart: boolean;
  showSearch: boolean;
  showAccount: boolean;
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const labelField = z.string().trim().min(1).max(80);
const hrefField = z.string().trim().min(1).max(500);

export const NavItemSchema: z.ZodType<NavItem> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    z
      .object({
        kind: z.literal("link"),
        label: labelField,
        href: hrefField,
        openInNewTab: z.boolean().optional(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("cta"),
        label: labelField,
        href: hrefField,
        style: z.enum(["primary", "ghost", "outline"]),
      })
      .strict(),
    z
      .object({
        kind: z.literal("dropdown"),
        label: labelField,
        items: z.array(NavItemSchema).max(50),
      })
      .strict(),
    z
      .object({
        kind: z.literal("mega-column"),
        label: labelField,
        columns: z
          .array(
            z
              .object({
                heading: z.string().trim().min(1).max(80),
                items: z.array(NavItemSchema).max(50),
              })
              .strict(),
          )
          .max(6),
      })
      .strict(),
    z
      .object({
        kind: z.literal("category-auto"),
        label: labelField,
      })
      .strict(),
    z
      .object({
        kind: z.literal("pages-auto"),
        label: labelField,
      })
      .strict(),
  ]),
);

export const NavItemsSchema = z.array(NavItemSchema).max(100);

export const NavConfigSchema: z.ZodType<NavConfig> = z
  .object({
    layout: z.enum(["standard", "centered", "split", "minimal"]),
    behavior: z.enum([
      "sticky",
      "static",
      "scroll-hide",
      "transparent-on-hero",
    ]),
    items: NavItemsSchema,
    cta: z
      .object({
        label: labelField,
        href: hrefField,
        style: z.enum(["primary", "ghost", "outline"]),
      })
      .strict()
      .optional(),
    mobile: z
      .object({
        drawerStyle: z.enum(["slide-left", "slide-right", "fullscreen"]),
        showSearch: z.boolean(),
      })
      .strict(),
    showCart: z.boolean(),
    showSearch: z.boolean(),
    showAccount: z.boolean(),
  })
  .strict() as unknown as z.ZodType<NavConfig>;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/**
 * Platform-wide default config for a brand new tenant. Matches the current
 * hardcoded `buildNavLinks()` layout in apps/tenant-site so new tenants see
 * a familiar nav out of the box.
 */
export function defaultHeaderNavConfig(): NavConfig {
  return {
    layout: "standard",
    behavior: "sticky",
    items: [
      { kind: "link", label: "Home", href: "/" },
      { kind: "link", label: "Shop", href: "/products" },
      { kind: "link", label: "Journal", href: "/blog" },
      { kind: "pages-auto", label: "Pages" },
      { kind: "link", label: "Contact", href: "/contact" },
    ],
    mobile: {
      drawerStyle: "slide-right",
      showSearch: false,
    },
    showCart: true,
    showSearch: false,
    showAccount: false,
  };
}

/**
 * Light-weight "items-only" payload used by footer slots. The footer renders
 * one column per slot, so the full NavConfig shape (layout/behavior/cta/...)
 * would be overkill — each footer slot is just a NavItem[] under the hood.
 */
export const NavItemsOnlySchema = z
  .object({
    items: NavItemsSchema,
  })
  .strict();

export type NavItemsOnly = z.infer<typeof NavItemsOnlySchema>;
