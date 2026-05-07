/**
 * Nav helpers for the tenant-site renderer.
 *
 * Fetches NavMenu rows for the current tenant and decodes them into the
 * shared NavConfig / NavItem / FooterConfig shapes. When a row exists the
 * renderer uses it; when it doesn't, callers fall through to the legacy
 * hardcoded header/footer in shared.tsx so existing tenants keep working
 * unchanged.
 */

import {
  NavConfigSchema,
  NavItemsOnlySchema,
  FooterConfigSchema,
  type NavConfig,
  type NavItem,
  type FooterConfig,
} from "@repo/shared";
import { getNavMenu, type PublicNavPage } from "./api";
import { getTenantContext } from "./tenant";

/**
 * Fetch + parse the header nav config for the current tenant. Returns null
 * when the tenant has no saved header menu yet or when the stored payload
 * fails validation (in which case we log and fall through to legacy).
 */
export async function loadHeaderNavConfig(): Promise<NavConfig | null> {
  try {
    const ctx = await getTenantContext();
    const menu = await getNavMenu(ctx.host, ctx.tenantId, "header-primary");
    if (!menu) return null;
    const parsed = NavConfigSchema.safeParse(menu.items);
    if (!parsed.success) {
      // eslint-disable-next-line no-console
      console.warn(
        "[tenant-site] header NavMenu failed validation; falling back",
        parsed.error.issues[0]?.message,
      );
      return null;
    }
    return parsed.data;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[tenant-site] loadHeaderNavConfig threw", err);
    return null;
  }
}

/**
 * Fetch + parse a footer/drawer items list. Unlike the header, these slots
 * only hold a `{ items: NavItem[] }` payload — we don't need layout or
 * behavior config for footer columns.
 */
export async function loadNavItems(
  slot: "footer-1" | "footer-2" | "mobile-drawer",
): Promise<NavItem[] | null> {
  try {
    const ctx = await getTenantContext();
    const menu = await getNavMenu(ctx.host, ctx.tenantId, slot);
    if (!menu) return null;
    const parsed = NavItemsOnlySchema.safeParse(menu.items);
    if (!parsed.success) {
      // eslint-disable-next-line no-console
      console.warn(
        `[tenant-site] ${slot} NavMenu failed validation; falling back`,
        parsed.error.issues[0]?.message,
      );
      return null;
    }
    return parsed.data.items;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[tenant-site] loadNavItems(${slot}) threw`, err);
    return null;
  }
}

/**
 * Expand the auto-items (`category-auto`, `pages-auto`) in a NavItem list
 * into concrete links. Auto-items are expanded against the live lists the
 * page has already fetched, so no extra round trip is needed.
 */
export function expandAutoItems(
  items: NavItem[],
  ctx: { navPages: PublicNavPage[] },
): NavItem[] {
  const expanded: NavItem[] = [];
  for (const item of items) {
    if (item.kind === "pages-auto") {
      for (const p of ctx.navPages) {
        expanded.push({ kind: "link", label: p.title, href: `/${p.slug}` });
      }
      continue;
    }
    if (item.kind === "category-auto") {
      // Categories live on the /products page via query params, so Phase 2
      // expands `category-auto` to a single "Shop" link until the listing
      // block (Phase 5) ships. This is intentionally conservative.
      expanded.push({ kind: "link", label: item.label, href: "/products" });
      continue;
    }
    if (item.kind === "dropdown") {
      expanded.push({
        ...item,
        items: expandAutoItems(item.items, ctx),
      });
      continue;
    }
    if (item.kind === "mega-column") {
      expanded.push({
        ...item,
        columns: item.columns.map((c) => ({
          ...c,
          items: expandAutoItems(c.items, ctx),
        })),
      });
      continue;
    }
    expanded.push(item);
  }
  return expanded;
}

/**
 * Fetch + parse the mobile drawer nav items for the current tenant. Returns null
 * when the tenant has no saved mobile drawer menu yet or when the stored payload
 * fails validation (in which case we log and fall through to empty drawer).
 */
export async function loadMobileDrawerConfig(): Promise<NavItem[] | null> {
  return loadNavItems("mobile-drawer");
}

/**
 * Fetch + parse the footer config for the current tenant. Returns null
 * when the tenant has no saved footer config yet or when the stored payload
 * fails validation (in which case we log and fall through to legacy).
 */
export async function loadFooterConfig(): Promise<FooterConfig | null> {
  try {
    const ctx = await getTenantContext();
    const menu = await getNavMenu(ctx.host, ctx.tenantId, "footer-config");
    if (!menu) return null;
    const parsed = FooterConfigSchema.safeParse(menu.items);
    if (!parsed.success) {
      // eslint-disable-next-line no-console
      console.warn(
        "[tenant-site] footer FooterConfig failed validation; falling back",
        parsed.error.issues[0]?.message,
      );
      return null;
    }
    return parsed.data;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[tenant-site] loadFooterConfig threw", err);
    return null;
  }
}
