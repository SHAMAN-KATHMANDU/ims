/**
 * Shared nav/footer seed builders for templates.
 *
 * Templates that don't override these get a sensible default: a primary nav
 * with Shop / Collections / Journal / About / Contact, two footer columns,
 * a mobile drawer that mirrors the header, and a footer-config that mirrors
 * the legacy hardcoded footer (brand + Shop column + socials placeholder +
 * legal copyright). Templates can override individual fields by spreading
 * the default and replacing keys.
 */

import type {
  NavConfig,
  NavItem,
  FooterConfig,
  FooterColumn,
  NavHeaderBehavior,
  NavHeaderLayout,
} from "@repo/shared";

export interface TemplateNavSeed {
  navConfig: NavConfig;
  mobileDrawerConfig: NavConfig;
  footerConfig: FooterConfig;
  footerPrimaryItems: NavItem[];
  footerSecondaryItems: NavItem[];
}

interface TemplateNavOverrides {
  /** Brand name surfaced in the footer brand block. */
  brandName?: string;
  brandTagline?: string;
  /** Override the primary nav items entirely. */
  navItems?: NavItem[];
  /** Optional CTA in the right slot of the header. */
  headerCta?: NavConfig["cta"];
  /** Header layout + behavior — defaults to standard / sticky. */
  headerLayout?: NavHeaderLayout;
  headerBehavior?: NavHeaderBehavior;
  /** Show search/account toggles in the header. */
  showSearch?: boolean;
  showAccount?: boolean;
  /** Override the default footer columns. */
  footerColumns?: FooterColumn[];
  /** Footer layout variant. */
  footerLayout?: FooterConfig["layout"];
  footerBackground?: FooterConfig["background"];
  /** Toggle newsletter signup in the footer. */
  enableNewsletter?: boolean;
  newsletterHeading?: string;
}

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { kind: "link", label: "Shop", href: "/products" },
  { kind: "category-auto", label: "Collections" },
  { kind: "link", label: "Journal", href: "/blog" },
  { kind: "pages-auto", label: "About" },
  { kind: "link", label: "Contact", href: "/contact" },
];

const DEFAULT_FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: "Shop",
    items: [
      { kind: "link", label: "All products", href: "/products" },
      { kind: "link", label: "New arrivals", href: "/products?sort=newest" },
      { kind: "link", label: "On sale", href: "/products?onSale=1" },
      // Auto-expanded against live category list at render time.
      { kind: "category-auto", label: "Browse categories" },
    ],
  },
  {
    heading: "Company",
    items: [
      { kind: "link", label: "Journal", href: "/blog" },
      { kind: "link", label: "Contact", href: "/contact" },
      // Auto-expanded against published TenantPage rows where showInNav=true.
      { kind: "pages-auto", label: "Pages" },
    ],
  },
];

/**
 * Build the full nav seed for a template. All five NavMenu rows
 * (header-primary, mobile-drawer, footer-1, footer-2, footer-config) are
 * populated so a fresh tenant sees a complete shell on first load.
 */
export function buildTemplateNavSeed(
  overrides: TemplateNavOverrides = {},
): TemplateNavSeed {
  const navItems = overrides.navItems ?? DEFAULT_NAV_ITEMS;
  const headerLayout = overrides.headerLayout ?? "standard";
  const headerBehavior = overrides.headerBehavior ?? "sticky";

  const navConfig: NavConfig = {
    layout: headerLayout,
    behavior: headerBehavior,
    items: navItems,
    ...(overrides.headerCta ? { cta: overrides.headerCta } : {}),
    mobile: { drawerStyle: "slide-right", showSearch: true },
    showCart: true,
    showSearch: overrides.showSearch ?? true,
    showAccount: overrides.showAccount ?? true,
  };

  const mobileDrawerConfig: NavConfig = {
    ...navConfig,
    layout: "minimal",
    behavior: "static",
    mobile: { drawerStyle: "slide-right", showSearch: true },
  };

  const footerColumns = overrides.footerColumns ?? DEFAULT_FOOTER_COLUMNS;

  const footerConfig: FooterConfig = {
    layout: overrides.footerLayout ?? "columns",
    background: overrides.footerBackground ?? "muted",
    brand: {
      name: overrides.brandName,
      tagline: overrides.brandTagline,
    },
    columns: footerColumns,
    socials: [],
    newsletter: {
      enabled: overrides.enableNewsletter ?? false,
      heading: overrides.newsletterHeading ?? "Stay in the loop",
      placeholder: "you@example.com",
      buttonLabel: "Subscribe",
    },
    legal: {
      showYear: true,
      links: [
        { label: "Privacy", href: "/privacy" },
        { label: "Terms", href: "/terms" },
      ],
    },
  };

  // footer-1 / footer-2 mirror the first two columns from footer-config so
  // the legacy renderer keeps working when a tenant has only the legacy
  // slots populated. Both column.items and footer-1/2 are NavItem[] now,
  // so we pass them through directly — auto-expand items survive into the
  // legacy footer too.
  const footerPrimaryItems: NavItem[] = footerColumns[0]?.items ?? [];
  const footerSecondaryItems: NavItem[] = footerColumns[1]?.items ?? [];

  return {
    navConfig,
    mobileDrawerConfig,
    footerConfig,
    footerPrimaryItems,
    footerSecondaryItems,
  };
}
