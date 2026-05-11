/**
 * Header blocks — navigation, branding, utility strips.
 *
 * nav-bar       — sticky navigation with logo, menu, search, cart
 *                 Phase 2: enriched with recursive items, mega-menu blocks, CTA, utility bar, mobile drawer
 * logo-mark     — standalone brand/logo display
 * utility-bar   — top strip with secondary navigation/utility links
 */

import React from "react";
import Link from "next/link";
import type { BlockComponentProps } from "../registry";
import type {
  NavBarProps,
  NavBarItem,
  NavBarBrand,
  BlockNode,
} from "@repo/shared";
import type { BlockDataContext } from "../data-context";
import { BlockRenderer } from "../BlockRenderer";

// NavItem renderer — supports recursive children and mega-menu blocks.
// `dataContext` is passed through so mega-menu sub-trees can render via
// the standard BlockRenderer with full IMS / asset access.
function NavItemRenderer({
  item,
  isCentered,
  dataContext,
}: {
  item: NavBarItem;
  isCentered?: boolean;
  dataContext: BlockDataContext;
}): React.ReactNode {
  const hasChildren = item.children && item.children.length > 0;
  const megaMenuNodes = Array.isArray(item.megaMenuBlocks)
    ? (item.megaMenuBlocks as BlockNode[])
    : [];
  const hasMegaMenu = item.hasMegaMenu === true && megaMenuNodes.length > 0;

  return (
    <div key={item.label} className="relative group">
      <Link
        href={item.href}
        className="no-underline text-[var(--t-text)] hover:opacity-70 transition-opacity inline-flex items-center gap-1 py-2"
      >
        {item.label}
        {(hasChildren || hasMegaMenu) && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity="0.6"
          >
            <path d="M3 5l3 3 3-3" />
          </svg>
        )}
      </Link>
      {/* Mega-menu wins over plain children when both are present —
          authoring a mega-menu implies the user wants the rich panel. */}
      {hasMegaMenu ? (
        <div className="absolute left-0 top-full pt-2 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 min-w-[24rem]">
          <div className="bg-white shadow-lg rounded-md p-4">
            <BlockRenderer nodes={megaMenuNodes} dataContext={dataContext} />
          </div>
        </div>
      ) : hasChildren ? (
        <div className="absolute left-0 pt-0 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white shadow-lg rounded-md min-w-max z-50">
          {item.children!.map((child: NavBarItem) => (
            <Link
              key={child.label}
              href={child.href}
              className="block px-4 py-2 text-sm text-[var(--t-text)] hover:bg-[var(--t-muted)] no-underline"
            >
              {child.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// Brand renderer — supports string (legacy) or object with logo.
// When `brand.logoAssetId` resolves through `dataContext.assets`,
// renders an `<img>` instead of falling back to text.
function BrandRenderer({
  brand,
  href,
  style,
  dataContext,
}: {
  brand: NavBarBrand;
  href?: string;
  style?: string;
  dataContext: BlockDataContext;
}): React.ReactNode {
  const brandHref = href ?? "/";
  const isObject = typeof brand !== "string" ? brand : null;
  const finalStyle = isObject?.style ?? style ?? "serif";

  const brandClasses = [
    "text-base no-underline",
    "text-[var(--t-text)]",
    "hover:opacity-70 transition-opacity",
    finalStyle === "serif" && "font-serif text-lg tracking-tight",
    finalStyle === "mono" && "font-mono tracking-wider text-sm uppercase",
  ]
    .filter(Boolean)
    .join(" ");

  const brandText = typeof brand === "string" ? brand : (brand.text ?? "Brand");
  const logoAssetId =
    typeof brand !== "string" && brand.logoAssetId ? brand.logoAssetId : null;
  const resolvedLogo = logoAssetId
    ? (dataContext.assets?.[logoAssetId] ?? null)
    : null;

  return (
    <Link href={brandHref} className={brandClasses}>
      {resolvedLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedLogo.publicUrl}
          alt={resolvedLogo.altText ?? brandText}
          loading="eager"
          decoding="async"
          style={{ height: 32, width: "auto", display: "block" }}
        />
      ) : (
        brandText
      )}
    </Link>
  );
}

export function NavBarBlock({
  props,
  dataContext,
}: BlockComponentProps<NavBarProps>) {
  const {
    variant = "standard",
    brand = "Shaman",
    brandHref = "/",
    brandStyle = "serif",
    items: propItems = [],
    cta,
    utilityBar,
    mobileDrawer,
    showSearch = true,
    showCart = true,
    showAccount = false,
    cartCount = 0,
    sticky: stickyProp,
    align: alignProp,
  } = props;

  // Variant overrides the legacy `align` + `sticky` props so the
  // variant picker can control layout from a single setting. Tenants
  // who edited `align` directly still win because `alignProp` /
  // `stickyProp` are read first.
  const align: "between" | "center" =
    alignProp ??
    (variant === "centered" || variant === "split" ? "center" : "between");
  const sticky = stickyProp ?? variant !== "transparent";
  const isTransparent = variant === "transparent";

  // Resolve nav items: site.navigation.primary (editor-managed, single
  // source of truth) → block override → empty. The Navigation tab in the
  // editor edits SiteConfig.navigation, which is seeded by Apply and
  // surfaced through dataContext.site.navigation. Falling back to
  // props.items lets a tenant override per-header for special pages.
  const sitePrimary = dataContext?.site?.navigation?.primary;
  const items: NavBarItem[] =
    Array.isArray(sitePrimary) && sitePrimary.length > 0
      ? sitePrimary.map((p) => ({ label: p.label, href: p.href }))
      : propItems;

  const isCentered = align === "center";

  const headerClasses = [
    "w-full",
    !isTransparent && "border-b",
    sticky && "sticky top-0 z-50",
    "px-6 md:px-12 py-4 md:py-5",
    isTransparent ? "bg-transparent" : "bg-[var(--t-bg)]",
  ]
    .filter(Boolean)
    .join(" ");

  const brandElement = (
    <BrandRenderer
      brand={brand}
      href={brandHref}
      style={brandStyle}
      dataContext={dataContext}
    />
  );

  // Tailwind needs class names to be statically resolvable, so the gap
  // template-string `gap-${isCentered ? 8 : 6}` was producing zero gap at
  // runtime — items rendered as "LivingDiningBedroomOutdoor". Pin the
  // class names instead.
  const navElement = items.length > 0 && (
    <nav
      className={`hidden md:flex ${isCentered ? "gap-8" : "gap-6"} text-sm text-[var(--t-text)]`}
    >
      {items.map((item: NavBarItem) => (
        <NavItemRenderer
          key={item.label}
          item={item}
          isCentered={isCentered}
          dataContext={dataContext}
        />
      ))}
    </nav>
  );

  const actionsElement = (
    <div className="flex items-center gap-3 text-[var(--t-text)]">
      {showSearch && (
        <button className="hover:opacity-70" aria-label="Search">
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </button>
      )}
      {showAccount && (
        <button className="hover:opacity-70" aria-label="Account">
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M6 21c0-4 2-6 6-6s6 2 6 6" />
          </svg>
        </button>
      )}
      {showCart && (
        <button className="relative hover:opacity-70" aria-label="Cart">
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          {cartCount > 0 && (
            <span
              className="absolute -top-1.5 -right-2 h-4 min-w-4 px-1 rounded-full grid place-items-center text-[9px] text-white font-semibold"
              style={{ background: "var(--t-primary)" }}
            >
              {cartCount}
            </span>
          )}
        </button>
      )}
      {cta && (
        <Link
          href={cta.href}
          className={[
            "px-4 py-2 rounded text-sm font-medium no-underline transition-opacity hover:opacity-80",
            cta.style === "primary" && "bg-[var(--t-primary)] text-white",
            cta.style === "outline" &&
              "border border-[var(--t-text)] text-[var(--t-text)]",
            cta.style === "ghost" &&
              "text-[var(--t-text)] hover:bg-[var(--t-muted)]",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {cta.label}
        </Link>
      )}
    </div>
  );

  // TODO Phase 7: render utilityBar as a top announcement strip
  // TODO Phase 7: render mobileDrawer as a <details>/<summary> on mobile

  if (isCentered) {
    return (
      <header className={headerClasses}>
        <div className="flex items-center justify-between mb-3">
          <div className="opacity-0 pointer-events-none hidden md:block">
            {actionsElement}
          </div>
          {brandElement}
          {actionsElement}
        </div>
        <div className="flex justify-center">{navElement}</div>
      </header>
    );
  }

  return (
    <header className={headerClasses}>
      <div className="flex items-center justify-between gap-6">
        {brandElement}
        {navElement}
        {actionsElement}
      </div>
    </header>
  );
}

// ---------- logo-mark -------------------------------------------------------

export interface LogoMarkProps {
  brand: string;
  href?: string;
  subtitle?: string;
  align?: "start" | "center" | "end";
  variant?: "text-only" | "with-icon";
}

export function LogoMarkBlock({ props }: BlockComponentProps<LogoMarkProps>) {
  const {
    brand = "Shaman",
    href = "/",
    subtitle,
    align = "center",
    variant = "text-only",
  } = props;

  const alignClasses = {
    start: "items-start text-left",
    center: "items-center text-center",
    end: "items-end text-right",
  }[align];

  return (
    <div className={`flex flex-col py-4 ${alignClasses}`}>
      <Link
        href={href}
        className="no-underline text-[var(--t-text)] hover:opacity-70 transition-opacity"
      >
        <div className="font-serif text-[28px] tracking-tight leading-[1] text-[var(--t-text)]">
          {brand}
        </div>
        {subtitle && (
          <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--t-muted)] mt-1">
            {subtitle}
          </div>
        )}
      </Link>
    </div>
  );
}

// ---------- utility-bar -----------------------------------------------------

export interface UtilityBarProps {
  items?: Array<{
    label: string;
    href: string;
  }>;
  align?: "start" | "center" | "end" | "between";
}

export function UtilityBarBlock({
  props,
}: BlockComponentProps<UtilityBarProps>) {
  const { items = [], align = "start" } = props;

  const justifyClasses = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
  }[align];

  return (
    <div
      className={`w-full text-[11.5px] tracking-wide text-[var(--t-muted)] flex items-center flex-wrap gap-x-6 gap-y-1 ${justifyClasses}`}
    >
      {items.map((item, i) => (
        <Link
          key={i}
          href={item.href}
          className="no-underline text-[var(--t-muted)] hover:text-[var(--t-text)] transition-colors"
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
