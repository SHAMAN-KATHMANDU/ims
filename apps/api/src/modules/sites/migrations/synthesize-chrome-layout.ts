/**
 * Chrome layout synthesis: converts NavMenu rows + FooterConfig into BlockNode trees.
 *
 * When an existing tenant (pre-Phase 3) requests header/footer layouts, this
 * function synthesizes BlockNode arrays from:
 *   1. The tenant's NavMenu rows (header-primary, mobile-drawer, footer-config, footer-1, footer-2)
 *   2. The template's fallback blueprint layouts (if NavMenu is missing)
 *
 * Pure function — no DB access, no side effects. All inputs explicit.
 * Output is validated against BlockTreeSchema before write.
 */

import type {
  BlockNode,
  NavConfig,
  NavItem,
  FooterConfig,
  FooterColumn,
} from "@repo/shared";
import { NavConfigSchema, FooterConfigSchema } from "@repo/shared";

export interface ChromeSynthesisInput {
  /** Header nav config from NavMenu(slot=header-primary) */
  navConfig?: NavConfig | null;

  /** Mobile drawer config from NavMenu(slot=mobile-drawer) or parsed from navConfig.mobile */
  mobileDrawerConfig?: NavConfig | null;

  /** Full footer config from NavMenu(slot=footer-config) */
  footerConfig?: FooterConfig | null;

  /** Legacy footer column 1 items from NavMenu(slot=footer-1) */
  footerPrimaryItems?: NavItem[];

  /** Legacy footer column 2 items from NavMenu(slot=footer-2) */
  footerSecondaryItems?: NavItem[];

  /** Template blueprint header fallback when NavMenu rows are missing */
  templateHeaderFallback?: BlockNode[];

  /** Template blueprint footer fallback when NavMenu rows are missing */
  templateFooterFallback?: BlockNode[];
}

/**
 * Generate deterministic synthesized block IDs to avoid collisions with user-created blocks.
 * Uses a prefix + scope + counter pattern.
 */
function makeSynthId(type: string, index: number): string {
  return `synth-${type}-${index}`;
}

/**
 * Convert NavItem[] into NavBarItem[] for nav-bar block consumption.
 * Recursively flattens dropdowns, mega-menus, and auto-expanding items.
 */
function navItemsToNavBarItems(items: NavItem[]): any[] {
  return items.map((item) => {
    if (item.kind === "link" || item.kind === "cta") {
      return {
        label: item.label,
        href: item.href,
      };
    }
    if (item.kind === "dropdown") {
      return {
        label: item.label,
        href: "#", // dropdowns don't have their own href
        children: navItemsToNavBarItems(item.items),
      };
    }
    if (item.kind === "mega-column") {
      // For mega-menus, flatten the columns and featured block into a tree
      const children: any[] = [];
      for (const column of item.columns) {
        // Each column becomes a "virtual" item with children
        children.push({
          label: column.heading,
          href: "#",
          children: navItemsToNavBarItems(column.items),
        });
      }
      return {
        label: item.label,
        href: "#",
        children,
        hasMegaMenu: true,
      };
    }
    // category-auto and pages-auto pass through — renderer expands at request time
    return {
      label: item.label,
      href: "#",
    };
  });
}

/**
 * Synthesize a header BlockNode array from NavConfig and optional fallback.
 *
 * If navConfig is present:
 *   - Creates a single nav-bar block with layout, items, cta, search/cart/account flags
 *   - Maps behavior "sticky" → sticky: true
 *   - Folding in mobileDrawer if present
 *   - Uses footerConfig.brand?.name as the brand text
 *
 * If navConfig is absent:
 *   - Returns templateHeaderFallback if provided, else empty array
 */
export function synthesizeHeaderBlocks(
  input: ChromeSynthesisInput,
): BlockNode[] {
  const { navConfig, mobileDrawerConfig, footerConfig, templateHeaderFallback } =
    input;

  if (!navConfig) {
    return templateHeaderFallback ?? [];
  }

  // Validate navConfig early — if it's present but invalid, fail loudly
  const navValidation = NavConfigSchema.safeParse(navConfig);
  if (!navValidation.success) {
    throw new Error(
      `Invalid NavConfig during header synthesis: ${navValidation.error.issues[0]?.message ?? "unknown"}`,
    );
  }

  // Map NavItem[] to NavBarItem[]
  const navBarItems = navItemsToNavBarItems(navConfig.items);

  // Build the nav-bar block
  const navBarBlock: BlockNode = {
    id: makeSynthId("nav-bar", 0),
    kind: "nav-bar",
    props: {
      brand: footerConfig?.brand?.name ?? "", // prefer footer brand name if available
      items: navBarItems,
      cta: navConfig.cta
        ? {
            label: navConfig.cta.label,
            href: navConfig.cta.href,
            style: navConfig.cta.style,
          }
        : undefined,
      sticky: navConfig.behavior === "sticky",
      showSearch: navConfig.showSearch,
      showCart: navConfig.showCart,
      showAccount: navConfig.showAccount,
      // Mobile drawer integration
      mobileDrawer: mobileDrawerConfig
        ? {
            items: navItemsToNavBarItems(mobileDrawerConfig.items),
            showSearch: mobileDrawerConfig.showSearch,
            showAccount: mobileDrawerConfig.showAccount,
          }
        : navConfig.mobile
          ? {
              items: [],
              showSearch: navConfig.mobile.showSearch,
              showAccount: false,
            }
          : undefined,
    },
  };

  return [navBarBlock];
}

/**
 * Synthesize a footer BlockNode array from FooterConfig and optional fallback.
 *
 * If footerConfig is present:
 *   - Creates a footer-columns block from footerConfig.columns
 *   - Adds brand name/tagline
 *   - Creates a social-links block if socials are present
 *   - Creates a copyright-bar block if legal info is present
 *
 * If footerConfig is absent but legacy footer-1/footer-2 items exist:
 *   - Creates a footer-columns block with those items as columns
 *
 * If all are absent:
 *   - Returns templateFooterFallback if provided, else empty array
 */
export function synthesizeFooterBlocks(
  input: ChromeSynthesisInput,
): BlockNode[] {
  const {
    footerConfig,
    footerPrimaryItems,
    footerSecondaryItems,
    templateFooterFallback,
  } = input;

  // If full FooterConfig is present, use it
  if (footerConfig) {
    const footerValidation = FooterConfigSchema.safeParse(footerConfig);
    if (!footerValidation.success) {
      throw new Error(
        `Invalid FooterConfig during footer synthesis: ${footerValidation.error.issues[0]?.message ?? "unknown"}`,
      );
    }

    const blocks: BlockNode[] = [];

    // Main footer-columns block
    const footerBlock: BlockNode = {
      id: makeSynthId("footer-columns", 0),
      kind: "footer-columns",
      props: {
        showBrand: !!(footerConfig.brand?.name || footerConfig.brand?.logoUrl),
        brand: footerConfig.brand?.name,
        tagline: footerConfig.brand?.tagline,
        columns: footerConfig.columns.map((col: FooterColumn) => ({
          title: col.heading,
          links: col.items
            .filter((item) => item.kind === "link" || item.kind === "cta")
            .map((item) => ({
              label: item.label,
              href: "href" in item ? item.href : "#",
            })),
        })),
      },
    };
    blocks.push(footerBlock);

    // Social links block
    if (footerConfig.socials && footerConfig.socials.length > 0) {
      const socialBlock: BlockNode = {
        id: makeSynthId("social-links", 0),
        kind: "social-links",
        props: {
          items: footerConfig.socials.map((social) => ({
            platform: social.network, // Map network → platform field name
            href: social.href,
          })),
        },
      };
      blocks.push(socialBlock);
    }

    // Copyright bar — only if legal text or links are present
    if (
      footerConfig.legal &&
      (footerConfig.legal.copyrightText ||
        (footerConfig.legal.links && footerConfig.legal.links.length > 0))
    ) {
      // Build the copyright text with optional year
      const year = footerConfig.legal.showYear
        ? new Date().getFullYear()
        : undefined;
      const copyrightText = footerConfig.legal.copyrightText
        ? `© ${year ? year + " " : ""}${footerConfig.legal.copyrightText}`
        : year
          ? `© ${year}`
          : "© All rights reserved";

      const copyrightBlock: BlockNode = {
        id: makeSynthId("copyright-bar", 0),
        kind: "copyright-bar",
        props: {
          copy: copyrightText,
          showLinks:
            footerConfig.legal.links && footerConfig.legal.links.length > 0,
          items: footerConfig.legal.links.map((link) => ({
            label: link.label,
            href: link.href,
          })),
        },
      };
      blocks.push(copyrightBlock);
    }

    return blocks;
  }

  // Legacy path: if footer-1 and/or footer-2 items exist, build from those
  const hasLegacyFooter =
    (footerPrimaryItems && footerPrimaryItems.length > 0) ||
    (footerSecondaryItems && footerSecondaryItems.length > 0);

  if (hasLegacyFooter) {
    const columns: Array<{ title: string; links: any[] }> = [];

    if (footerPrimaryItems && footerPrimaryItems.length > 0) {
      columns.push({
        title: "Shop",
        links: footerPrimaryItems
          .filter((item) => item.kind === "link" || item.kind === "cta")
          .map((item) => ({
            label: item.label,
            href: "href" in item ? item.href : "#",
          })),
      });
    }

    if (footerSecondaryItems && footerSecondaryItems.length > 0) {
      columns.push({
        title: "Company",
        links: footerSecondaryItems
          .filter((item) => item.kind === "link" || item.kind === "cta")
          .map((item) => ({
            label: item.label,
            href: "href" in item ? item.href : "#",
          })),
      });
    }

    if (columns.length > 0) {
      return [
        {
          id: makeSynthId("footer-columns", 0),
          kind: "footer-columns",
          props: {
            columns,
          },
        },
      ];
    }
  }

  // No nav config, legacy items, or footer config → use template fallback or empty
  return templateFooterFallback ?? [];
}
