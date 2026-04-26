/**
 * Shared sub-components used across every template layout.
 *
 * Phase C.3 rewrite: every visual constant is now a CSS custom property
 * (`var(--color-*)`, `var(--radius)`, `var(--section-padding)`) so
 * rewriting a template no longer means rewriting its colors. Templates
 * wrap their own root in a `data-template="..."` attribute so per-template
 * CSS overrides (added in C.4) can scope cleanly.
 *
 * The header supports dynamic tenant-authored nav entries from
 * `navPages` alongside the built-in links; pages are rendered in
 * `navOrder` order. Every nav link goes through `<Link>` so client-side
 * transitions stay instant.
 */

import type {
  PublicProduct,
  PublicSite,
  PublicCategory,
  PublicNavPage,
} from "@/lib/api";
import {
  brandingDisplayName,
  brandingTagline,
  brandingLogoUrl,
} from "@/lib/theme";
import Link from "next/link";
import { CartBadge } from "@/components/cart/CartBadge";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { PdpBuyboxClient } from "@/components/blocks/kinds/PdpBuyboxClient";
import { loadHeaderNavConfig, loadNavItems, expandAutoItems } from "@/lib/nav";
import { formatPrice as formatPriceShared } from "@/lib/format";
import type { NavConfig, NavItem } from "@repo/shared";
import { MobileNavDrawer } from "@/components/nav/MobileNavDrawer";
import { SearchBar } from "@/components/search/SearchBar";
import { QuickAddButton } from "@/components/cart/QuickAddButton";
import { ThemeToggle } from "@/components/templates/ThemeToggle";
import type { LucideIcon } from "lucide-react";
import {
  Facebook,
  Instagram,
  Linkedin,
  MessageCircle,
  Music2,
  Twitter,
  Youtube,
} from "lucide-react";

type SocialKey =
  | "facebook"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "whatsapp"
  | "x"
  | "linkedin";

// lucide-react has icons for most networks. TikTok and WhatsApp aren't in the
// set, so we reuse Music2 and MessageCircle as recognizable stand-ins; X is
// the rebranded Twitter, so we use Twitter's bird glyph.
const SOCIAL_META: Record<SocialKey, { label: string; Icon: LucideIcon }> = {
  facebook: { label: "Facebook", Icon: Facebook },
  instagram: { label: "Instagram", Icon: Instagram },
  tiktok: { label: "TikTok", Icon: Music2 },
  youtube: { label: "YouTube", Icon: Youtube },
  whatsapp: { label: "WhatsApp", Icon: MessageCircle },
  x: { label: "X", Icon: Twitter },
  linkedin: { label: "LinkedIn", Icon: Linkedin },
};

const SOCIAL_ORDER: SocialKey[] = [
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "x",
  "linkedin",
  "whatsapp",
];

// ============================================================================
// Brand + header
// ============================================================================

export function BrandMark({ site, host }: { site: PublicSite; host: string }) {
  // Prefer TenantBusinessProfile identity; fall back to legacy branding JSON.
  const bp = site.businessProfile;
  const name =
    bp?.displayName?.trim() || brandingDisplayName(site.branding, host);
  const logo = bp?.logoUrl?.trim() || brandingLogoUrl(site.branding);
  if (logo) {
    return (
      <Link
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.6rem",
          color: "var(--color-text)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt=""
          aria-hidden="true"
          // Responsive height: clamps between 28px (small phones) and 40px
          // (wide desktops). Fixed pixel heights blow up the header on
          // narrow viewports because `width: auto` keeps the aspect ratio.
          style={{
            height: "clamp(28px, 4vw, 40px)",
            width: "auto",
            display: "block",
          }}
        />
        <span
          style={{
            fontWeight: 600,
            fontFamily: "var(--font-heading)",
            fontSize: "1.05rem",
          }}
        >
          {name}
        </span>
      </Link>
    );
  }
  return (
    <Link
      href="/"
      style={{
        fontWeight: 700,
        fontSize: "1.25rem",
        letterSpacing: "-0.01em",
        fontFamily: "var(--font-heading)",
        color: "var(--color-text)",
      }}
    >
      {name}
    </Link>
  );
}

type NavVariant = "standard" | "centered" | "split";

type NavLink = { href: string; label: string };

function buildNavLinks(
  navPages: PublicNavPage[],
  includeCategories: boolean,
): NavLink[] {
  const links: NavLink[] = [
    { href: "/", label: "Home" },
    { href: "/products", label: "Shop" },
  ];
  if (includeCategories) {
    // We keep a single "Shop" entry — categories pages inside /products use
    // query params — but some templates show a separate "Categories" link.
    // The "Shop" entry stays canonical; templates can choose to hide it.
  }
  links.push({ href: "/blog", label: "Journal" });
  // Tenant-authored pages (ordered by navOrder; slug becomes /<slug>).
  for (const p of navPages) {
    links.push({ href: `/${p.slug}`, label: p.title });
  }
  links.push({ href: "/contact", label: "Contact" });
  return links;
}

// ---------------------------------------------------------------------------
// NavConfig-driven header (Phase 2)
// ---------------------------------------------------------------------------

function NavCtaButton({
  label,
  href,
  style,
}: {
  label: string;
  href: string;
  style: "primary" | "ghost" | "outline";
}) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0.6rem 1.1rem",
    minHeight: 44,
    fontSize: "0.85rem",
    fontWeight: 600,
    borderRadius: "var(--radius)",
    textDecoration: "none",
    whiteSpace: "nowrap",
    transition: "opacity 0.15s ease",
  };
  const themed: Record<typeof style, React.CSSProperties> = {
    primary: {
      background: "var(--color-primary)",
      color: "var(--color-on-primary, #fff)",
      border: "1px solid var(--color-primary)",
    },
    outline: {
      background: "transparent",
      color: "var(--color-text)",
      border: "1px solid var(--color-border)",
    },
    ghost: {
      background: "transparent",
      color: "var(--color-text)",
      border: "1px solid transparent",
    },
  };
  return (
    <Link href={href} style={{ ...base, ...themed[style] }}>
      {label}
    </Link>
  );
}

function NavItemView({ item }: { item: NavItem }) {
  const linkStyle: React.CSSProperties = {
    fontSize: "0.92rem",
    color: "var(--color-text)",
    opacity: 0.8,
    transition: "opacity 0.15s ease",
  };
  if (item.kind === "link") {
    return (
      <Link
        href={item.href}
        style={linkStyle}
        {...(item.openInNewTab
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
      >
        {item.label}
      </Link>
    );
  }
  if (item.kind === "cta") {
    return (
      <NavCtaButton label={item.label} href={item.href} style={item.style} />
    );
  }
  if (item.kind === "dropdown") {
    // Phase 2: a simple CSS hover dropdown. No JS, works server-rendered.
    // Trigger is a <button> so keyboard users can focus it; the panel
    // opens via `:focus-within` in globals.css.
    return (
      <div className="tpl-dropdown" style={{ position: "relative" }}>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded="false"
          style={{
            ...linkStyle,
            minHeight: 44,
            padding: "0 0.25rem",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            font: "inherit",
          }}
        >
          {item.label} <span aria-hidden="true">▾</span>
        </button>
        <div
          className="tpl-dropdown-panel"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            minWidth: 200,
            padding: "0.75rem 0",
            background: "var(--color-surface, var(--color-background))",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
            zIndex: 30,
          }}
        >
          {item.items.map((sub, i) => (
            <div key={i} style={{ padding: "0.25rem 1rem" }}>
              <NavItemView item={sub} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (item.kind === "mega-column") {
    const columnCount = item.columns.length + (item.featured ? 1 : 0);
    return (
      <div className="tpl-dropdown" style={{ position: "relative" }}>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded="false"
          style={{
            ...linkStyle,
            minHeight: 44,
            padding: "0 0.25rem",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            font: "inherit",
          }}
        >
          {item.label} <span aria-hidden="true">▾</span>
        </button>
        <div
          className="tpl-dropdown-panel"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            padding: "1.25rem",
            background: "var(--color-surface, var(--color-background))",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
            display: "grid",
            gridTemplateColumns: `repeat(${columnCount}, minmax(160px, 1fr))`,
            gap: "2rem",
            zIndex: 30,
          }}
        >
          {item.featured && (
            <Link
              href={item.featured.href}
              style={{
                display: "block",
                borderRadius: "var(--radius)",
                overflow: "hidden",
                textDecoration: "none",
                color: "var(--color-text)",
                minWidth: 220,
              }}
            >
              <div
                style={{
                  position: "relative",
                  aspectRatio: "4 / 3",
                  backgroundImage: `url(${item.featured.imageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  borderRadius: "var(--radius)",
                  marginBottom: "0.75rem",
                }}
                role="img"
                aria-label={
                  item.featured.heading ?? item.featured.ctaLabel ?? "Featured"
                }
              />
              {item.featured.heading && (
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    marginBottom: "0.25rem",
                  }}
                >
                  {item.featured.heading}
                </div>
              )}
              {item.featured.subtitle && (
                <div
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--color-muted)",
                    marginBottom: "0.4rem",
                    lineHeight: 1.45,
                  }}
                >
                  {item.featured.subtitle}
                </div>
              )}
              <span
                style={{
                  fontSize: "0.82rem",
                  color: "var(--color-text)",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                }}
              >
                {item.featured.ctaLabel ?? "Shop now"} →
              </span>
            </Link>
          )}
          {item.columns.map((col, ci) => (
            <div key={ci}>
              <div
                style={{
                  fontSize: "0.72rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "var(--color-muted)",
                  marginBottom: "0.75rem",
                  fontWeight: 600,
                }}
              >
                {col.heading}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                }}
              >
                {col.items.map((sub, i) => (
                  <NavItemView key={i} item={sub} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  // `pages-auto` / `category-auto` should have been expanded before reaching
  // this renderer. If one slipped through, render nothing.
  return null;
}

function SiteHeaderFromConfig({
  site,
  host,
  config,
  navPages,
}: {
  site: PublicSite;
  host: string;
  config: NavConfig;
  navPages: PublicNavPage[];
}) {
  const items = expandAutoItems(config.items, { navPages });

  const position: React.CSSProperties["position"] =
    config.behavior === "sticky" || config.behavior === "scroll-hide"
      ? "sticky"
      : "static";

  const baseHeader: React.CSSProperties = {
    borderBottom: "1px solid var(--color-border)",
    padding: "1.25rem 0",
    background:
      config.behavior === "transparent-on-hero"
        ? "transparent"
        : "var(--color-background)",
    position,
    top: 0,
    zIndex: 20,
    backdropFilter: "saturate(140%) blur(6px)",
  };

  const renderNavList = (list: NavItem[]) =>
    list.map((item, i) => <NavItemView key={i} item={item} />);

  const Trailing = () => (
    <>
      {config.showSearch && (
        <span className="tpl-nav-search">
          <SearchBar />
        </span>
      )}
      {config.cta && (
        <NavCtaButton
          label={config.cta.label}
          href={config.cta.href}
          style={config.cta.style}
        />
      )}
      <ThemeToggle />
      {config.showCart && <CartBadge />}
      <MobileNavDrawer items={items} drawerStyle={config.mobile.drawerStyle} />
    </>
  );

  if (config.layout === "centered") {
    return (
      <header style={baseHeader}>
        <div
          className="container"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <BrandMark site={site} host={host} />
          <nav
            aria-label="Primary"
            className="tpl-nav"
            style={{
              display: "flex",
              gap: "1.5rem",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {renderNavList(items)}
            <Trailing />
          </nav>
        </div>
      </header>
    );
  }

  if (config.layout === "split") {
    const half = Math.ceil(items.length / 2);
    const left = items.slice(0, half);
    const right = items.slice(half);
    return (
      <header style={baseHeader}>
        <div
          className="container tpl-header-split"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: "2rem",
          }}
        >
          <nav
            aria-label="Primary left"
            className="tpl-nav"
            style={{ display: "flex", gap: "1.5rem" }}
          >
            {renderNavList(left)}
          </nav>
          <BrandMark site={site} host={host} />
          <nav
            aria-label="Primary right"
            className="tpl-nav"
            style={{
              display: "flex",
              gap: "1.5rem",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            {renderNavList(right)}
            <Trailing />
          </nav>
        </div>
      </header>
    );
  }

  if (config.layout === "minimal") {
    return (
      <header style={baseHeader}>
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <BrandMark site={site} host={host} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1.25rem",
            }}
          >
            <Trailing />
          </div>
        </div>
      </header>
    );
  }

  // Default: standard — brand left, links right.
  return (
    <header style={baseHeader}>
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <BrandMark site={site} host={host} />
        <nav
          aria-label="Primary"
          className="tpl-nav"
          style={{
            display: "flex",
            gap: "1.75rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {renderNavList(items)}
          <Trailing />
        </nav>
      </div>
    </header>
  );
}

export async function SiteHeader({
  site,
  host,
  categories,
  navPages,
  variant = "standard",
}: {
  site: PublicSite;
  host: string;
  categories: PublicCategory[];
  navPages: PublicNavPage[];
  variant?: NavVariant;
}) {
  // Phase 2: if the tenant has saved a NavMenu for "header-primary", render
  // from it and ignore the per-template `variant`. Falling through to the
  // hardcoded `buildNavLinks()` path preserves every existing tenant who
  // hasn't touched the editor yet.
  const navConfig = await loadHeaderNavConfig();
  if (navConfig) {
    return (
      <SiteHeaderFromConfig
        site={site}
        host={host}
        config={navConfig}
        navPages={navPages}
      />
    );
  }

  const links = buildNavLinks(navPages, categories.length > 0);

  const baseHeader: React.CSSProperties = {
    borderBottom: "1px solid var(--color-border)",
    padding: "1.25rem 0",
    background: "var(--color-background)",
    position: "sticky",
    top: 0,
    zIndex: 20,
    backdropFilter: "saturate(140%) blur(6px)",
  };

  const navLinkStyle: React.CSSProperties = {
    fontSize: "0.92rem",
    color: "var(--color-text)",
    opacity: 0.75,
    transition: "opacity 0.15s ease",
  };

  if (variant === "centered") {
    return (
      <header style={baseHeader}>
        <div
          className="container"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <BrandMark site={site} host={host} />
          <nav
            aria-label="Primary"
            className="tpl-nav"
            style={{
              display: "flex",
              gap: "1.5rem",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {links.map((l) => (
              <Link key={l.href} href={l.href} style={navLinkStyle}>
                {l.label}
              </Link>
            ))}
            <ThemeToggle />
            <CartBadge />
          </nav>
        </div>
      </header>
    );
  }

  if (variant === "split") {
    const half = Math.ceil(links.length / 2);
    const left = links.slice(0, half);
    const right = links.slice(half);
    return (
      <header style={baseHeader}>
        <div
          className="container tpl-header-split"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: "2rem",
          }}
        >
          <nav
            aria-label="Primary left"
            className="tpl-nav"
            style={{ display: "flex", gap: "1.5rem" }}
          >
            {left.map((l) => (
              <Link key={l.href} href={l.href} style={navLinkStyle}>
                {l.label}
              </Link>
            ))}
          </nav>
          <BrandMark site={site} host={host} />
          <nav
            aria-label="Primary right"
            className="tpl-nav"
            style={{
              display: "flex",
              gap: "1.5rem",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            {right.map((l) => (
              <Link key={l.href} href={l.href} style={navLinkStyle}>
                {l.label}
              </Link>
            ))}
            <ThemeToggle />
            <CartBadge />
          </nav>
        </div>
      </header>
    );
  }

  // Standard: left-aligned brand, right-aligned links.
  return (
    <header style={baseHeader}>
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <BrandMark site={site} host={host} />
        <nav
          aria-label="Primary"
          className="tpl-nav"
          style={{
            display: "flex",
            gap: "1.75rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {links.map((l) => (
            <Link key={l.href} href={l.href} style={navLinkStyle}>
              {l.label}
            </Link>
          ))}
          <span className="tpl-nav-search">
            <SearchBar />
          </span>
          <ThemeToggle />
          <CartBadge />
        </nav>
      </div>
    </header>
  );
}

// ============================================================================
// Hero
// ============================================================================

export type HeroVariant =
  | "minimal"
  | "standard"
  | "luxury"
  | "boutique"
  | "editorial"
  | "video"
  | "shoppable";

export function Hero({
  site,
  host,
  variant = "standard",
  ctaHref = "/products",
  ctaLabel = "Shop the collection",
  title,
  subtitle,
  imageUrl,
  heroLayout = "centered",
  videoUrl,
  videoPoster,
  shoppableProducts,
}: {
  site: PublicSite;
  host: string;
  variant?: HeroVariant;
  ctaHref?: string;
  ctaLabel?: string;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  heroLayout?: "centered" | "split-left" | "split-right" | "overlay";
  videoUrl?: string;
  videoPoster?: string;
  shoppableProducts?: PublicProduct[];
}) {
  const name = title ?? brandingDisplayName(site.branding, host);
  const tagline = subtitle ?? brandingTagline(site.branding);

  if (variant === "video" && videoUrl) {
    return (
      <section
        className="tpl-hero tpl-hero-video"
        style={{
          position: "relative",
          minHeight: "min(80vh, 720px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          color: "#fff",
          textAlign: "center",
        }}
      >
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={videoPoster}
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        >
          <source src={videoUrl} />
        </video>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.55))",
          }}
        />
        <div
          className="container"
          style={{
            position: "relative",
            padding: "6rem 1rem",
            maxWidth: 860,
          }}
        >
          <h1
            data-editable-text="title"
            style={{
              fontSize: "clamp(2.75rem, 6vw, 5rem)",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              marginBottom: "1.25rem",
            }}
          >
            {name}
          </h1>
          {tagline && (
            <p
              data-editable-text="subtitle"
              style={{
                fontSize: "clamp(1.05rem, 1.6vw, 1.35rem)",
                color: "rgba(255,255,255,0.88)",
                maxWidth: 620,
                margin: "0 auto 2rem",
                lineHeight: 1.55,
              }}
            >
              {tagline}
            </p>
          )}
          <Link href={ctaHref} className="btn">
            {ctaLabel}
          </Link>
        </div>
      </section>
    );
  }

  if (variant === "shoppable") {
    const products = (shoppableProducts ?? []).slice(0, 4);
    return (
      <section
        className="tpl-hero tpl-hero-shoppable"
        style={{
          position: "relative",
          padding: "5rem 0 4rem",
          backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: imageUrl ? "#fff" : "var(--color-text)",
        }}
      >
        {imageUrl && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0.55))",
            }}
          />
        )}
        <div
          className="container"
          style={{ position: "relative", textAlign: "center" }}
        >
          <h1
            data-editable-text="title"
            style={{
              fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              marginBottom: "1rem",
            }}
          >
            {name}
          </h1>
          {tagline && (
            <p
              data-editable-text="subtitle"
              style={{
                fontSize: "clamp(1rem, 1.5vw, 1.2rem)",
                color: imageUrl
                  ? "rgba(255,255,255,0.85)"
                  : "var(--color-muted)",
                maxWidth: 620,
                margin: "0 auto 2rem",
                lineHeight: 1.55,
              }}
            >
              {tagline}
            </p>
          )}
          {products.length > 0 && (
            <div
              role="list"
              aria-label="Featured products"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(auto-fit, minmax(min(200px, 100%), 1fr))`,
                gap: "1.25rem",
                marginTop: "2.5rem",
                marginBottom: "2rem",
                background: imageUrl ? "rgba(255,255,255,0.96)" : "transparent",
                padding: imageUrl ? "1.5rem" : 0,
                borderRadius: imageUrl ? "var(--radius)" : 0,
                color: "var(--color-text)",
              }}
            >
              {products.map((p, i) => (
                <div key={p.id} role="listitem">
                  <ProductCard
                    product={p}
                    variant="bare"
                    showPrice
                    showDiscount
                    priority={i < 2}
                  />
                </div>
              ))}
            </div>
          )}
          <Link href={ctaHref} className="btn">
            {ctaLabel}
          </Link>
        </div>
      </section>
    );
  }

  // Bigger, more editorial padding across the board — matches the Vercel
  // Commerce / Shopify Dawn scale where the hero actually dominates the
  // first viewport instead of feeling cramped.
  const padding =
    variant === "minimal"
      ? "6rem 0 5rem"
      : variant === "luxury"
        ? "10rem 0 8.5rem"
        : variant === "boutique"
          ? "7.5rem 0 6rem"
          : variant === "editorial"
            ? "9rem 0 7rem"
            : "7rem 0 5.5rem";

  const fontSize =
    variant === "luxury"
      ? "clamp(3.25rem, 7vw, 5.5rem)"
      : variant === "editorial"
        ? "clamp(3rem, 6vw, 5rem)"
        : variant === "minimal"
          ? "clamp(2.5rem, 5vw, 4rem)"
          : "clamp(2.75rem, 5.5vw, 4.25rem)";

  const letterSpacing =
    variant === "minimal"
      ? "-0.035em"
      : variant === "luxury"
        ? "0.015em"
        : "-0.02em";

  const fontWeight =
    variant === "minimal" ? 500 : variant === "luxury" ? 500 : 700;

  const fontFamily = "var(--font-display)";

  const textContent = (
    <>
      <h1
        data-editable-text="title"
        style={{
          fontSize,
          marginBottom: "1.5rem",
          letterSpacing,
          fontWeight,
          fontFamily,
          lineHeight: 1.05,
          color: heroLayout === "overlay" ? "#fff" : "var(--color-text)",
        }}
      >
        {name}
      </h1>
      {tagline && (
        <p
          data-editable-text="subtitle"
          style={{
            fontSize: "clamp(1.05rem, 1.6vw, 1.35rem)",
            color:
              heroLayout === "overlay"
                ? "rgba(255,255,255,0.85)"
                : "var(--color-muted)",
            maxWidth: 620,
            margin:
              heroLayout === "split-left" || heroLayout === "split-right"
                ? "0 0 2.5rem"
                : "0 auto 2.5rem",
            lineHeight: 1.6,
          }}
        >
          {tagline}
        </p>
      )}
      <div>
        <Link href={ctaHref} className="btn">
          {ctaLabel}
        </Link>
      </div>
    </>
  );

  if (heroLayout === "overlay" && imageUrl) {
    return (
      <section
        className="tpl-hero"
        style={{
          padding,
          textAlign: "center",
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "relative",
        }}
      >
        {/* Preload hint for above-the-fold hero background */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Hero banner"
          decoding="async"
          fetchPriority="high"
          style={{ display: "none" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.6))",
          }}
        />
        <div
          className="container"
          style={{ maxWidth: 960, margin: "0 auto", position: "relative" }}
        >
          {textContent}
        </div>
      </section>
    );
  }

  if (
    (heroLayout === "split-left" || heroLayout === "split-right") &&
    imageUrl
  ) {
    const imageEl = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        aria-hidden="true"
        decoding="async"
        fetchPriority="high"
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    );
    return (
      <section
        className="tpl-hero tpl-hero-split"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "3rem",
          padding,
          background: "var(--color-background)",
          alignItems: "center",
        }}
      >
        {heroLayout === "split-left" ? (
          <>
            <div>{imageEl}</div>
            <div>{textContent}</div>
          </>
        ) : (
          <>
            <div>{textContent}</div>
            <div>{imageEl}</div>
          </>
        )}
      </section>
    );
  }

  return (
    <section
      className="tpl-hero"
      style={{
        padding,
        textAlign: "center",
        background: "var(--color-background)",
      }}
    >
      <div className="container" style={{ maxWidth: 960, margin: "0 auto" }}>
        {textContent}
      </div>
    </section>
  );
}

// ============================================================================
// Products
// ============================================================================

// ProductCard (and its PriceDisplay / formatPrice helpers) live in a
// dedicated module so client components (e.g. ProductCarousel) can
// import the card without transitively loading this file's server-only
// nav helpers (which touch next/headers and break the client bundle).
// We both re-export it (so `shared` stays the canonical import path
// for existing server callers) and pull in a local binding so
// ProductGrid below can reference ProductCard by name.
import { ProductCard } from "./ProductCard";
export { ProductCard };

export function ProductGrid({
  products,
  columns = 4,
  variant = "bordered",
  showCategory,
  showPrice,
  showDiscount,
  cardAspectRatio,
  formatOpts,
}: {
  products: PublicProduct[];
  columns?: number;
  variant?: "bordered" | "bare" | "card";
  showCategory?: boolean;
  showPrice?: boolean;
  showDiscount?: boolean;
  cardAspectRatio?: string;
  formatOpts?: import("@/lib/format").FormatPriceOptions;
}) {
  if (products.length === 0) {
    return (
      <p
        style={{
          textAlign: "center",
          padding: "3rem 0",
          color: "var(--color-muted)",
          fontSize: "0.95rem",
        }}
      >
        No products yet.
      </p>
    );
  }
  // Larger minimum card width: 260px floor on 2-col grids, scaling up to
  // ~320px on 3-col and ~380px on wider grids. This pushes toward the
  // Vercel Commerce / Shopify Dawn aesthetic where cards dominate the
  // viewport instead of shrinking into thumbnails.
  const minWidth = Math.max(260, Math.floor(1280 / columns) - 28);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))`,
        gap: "2.25rem 1.75rem",
      }}
    >
      {products.map((p, i) => (
        <ProductCard
          key={p.id}
          product={p}
          variant={variant}
          showCategory={showCategory}
          showPrice={showPrice}
          showDiscount={showDiscount}
          aspectRatio={cardAspectRatio}
          priority={i < 2}
          formatOpts={formatOpts}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Contact + footer
// ============================================================================

export function ContactBlock({ site }: { site: PublicSite }) {
  // Prefer TenantBusinessProfile contact fields; fall back to legacy JSON.
  const bp = site.businessProfile;
  const legacyContact = (site.contact ?? {}) as {
    email?: string;
    phone?: string;
    address?: string;
    mapUrl?: string;
  };
  const bpAddress = bp
    ? [bp.addressLine1, bp.city, bp.state, bp.postalCode]
        .filter(Boolean)
        .join(", ") || null
    : null;
  const contact = {
    email: bp?.email?.trim() || legacyContact.email,
    phone: bp?.phone?.trim() || legacyContact.phone,
    address: bpAddress || legacyContact.address,
    mapUrl: legacyContact.mapUrl,
  };
  if (!contact.email && !contact.phone && !contact.address) return null;

  return (
    <section style={{ padding: "var(--section-padding) 0" }}>
      <div className="container">
        <h2
          style={{
            fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
            fontFamily: "var(--font-heading)",
            marginBottom: "2rem",
          }}
        >
          Get in touch
        </h2>
        <dl
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "2rem",
            maxWidth: 720,
          }}
        >
          {contact.email && (
            <div>
              <dt
                style={{
                  color: "var(--color-muted)",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "0.4rem",
                }}
              >
                Email
              </dt>
              <dd>
                <a
                  href={`mailto:${contact.email}`}
                  style={{ color: "var(--color-primary)" }}
                >
                  {contact.email}
                </a>
              </dd>
            </div>
          )}
          {contact.phone && (
            <div>
              <dt
                style={{
                  color: "var(--color-muted)",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "0.4rem",
                }}
              >
                Phone
              </dt>
              <dd>
                <a
                  href={`tel:${contact.phone}`}
                  style={{ color: "var(--color-primary)" }}
                >
                  {contact.phone}
                </a>
              </dd>
            </div>
          )}
          {contact.address && (
            <div>
              <dt
                style={{
                  color: "var(--color-muted)",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "0.4rem",
                }}
              >
                Address
              </dt>
              <dd style={{ lineHeight: 1.6 }}>{contact.address}</dd>
            </div>
          )}
        </dl>
      </div>
    </section>
  );
}

function FooterColumn({
  heading,
  items,
  fallback,
}: {
  heading: string;
  items: NavItem[] | null;
  fallback?: React.ReactNode;
}) {
  const hasItems = items && items.length > 0;
  return (
    <div>
      <h4
        style={{
          fontSize: "0.72rem",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "var(--color-muted)",
          marginBottom: "1rem",
          fontWeight: 600,
        }}
      >
        {heading}
      </h4>
      <ul
        style={{
          listStyle: "none",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          fontSize: "0.9rem",
        }}
      >
        {hasItems
          ? items!.map((item, i) => {
              if (item.kind === "link") {
                return (
                  <li key={i}>
                    <Link
                      href={item.href}
                      {...(item.openInNewTab
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              }
              if (item.kind === "cta") {
                return (
                  <li key={i}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                );
              }
              // Dropdowns/mega-menus collapse to the top-level label in the
              // footer — Phase 2 keeps the footer flat.
              if (item.kind === "dropdown" || item.kind === "mega-column") {
                return (
                  <li key={i}>
                    <span>{item.label}</span>
                  </li>
                );
              }
              return null;
            })
          : fallback}
      </ul>
    </div>
  );
}

function SocialsRow({
  socials,
}: {
  socials: Partial<Record<SocialKey, string>>;
}) {
  const entries = SOCIAL_ORDER.filter(
    (k) => typeof socials[k] === "string" && (socials[k] as string).length > 0,
  );
  if (entries.length === 0) return null;
  return (
    <div
      style={{
        display: "flex",
        gap: "0.75rem",
        marginTop: "1rem",
        flexWrap: "wrap",
      }}
    >
      {entries.map((key) => {
        const { label, Icon } = SOCIAL_META[key];
        return (
          <a
            key={key}
            href={socials[key]}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            style={{
              width: 44,
              height: 44,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "var(--radius)",
              border: "1px solid var(--color-border)",
              color: "var(--color-muted)",
              transition: "color 0.2s, border-color 0.2s",
            }}
          >
            <Icon size={16} />
          </a>
        );
      })}
    </div>
  );
}

export async function SiteFooter({
  site,
  host,
  navPages = [],
}: {
  site: PublicSite;
  host: string;
  navPages?: PublicNavPage[];
}) {
  // Prefer TenantBusinessProfile identity + contact; fall back to legacy JSON.
  const bp = site.businessProfile;
  const name =
    bp?.displayName?.trim() || brandingDisplayName(site.branding, host);
  const legacyContact = (site.contact ?? {}) as {
    email?: string;
    phone?: string;
    address?: string;
    socials?: Partial<Record<SocialKey, string>>;
  };
  // Build a resolved address string from structured fields when available.
  const bpAddress = bp
    ? [bp.addressLine1, bp.city, bp.state, bp.postalCode]
        .filter(Boolean)
        .join(", ") || null
    : null;
  const contact = {
    email: bp?.email?.trim() || legacyContact.email,
    phone: bp?.phone?.trim() || legacyContact.phone,
    address: bpAddress || legacyContact.address,
    socials: legacyContact.socials,
  };
  const socials = contact.socials ?? {};

  // Phase 2: tenant-editable footer columns. `footer-1` replaces the built-in
  // "Shop" column; `footer-2` replaces the "About" column (which today auto-
  // derives from TenantPage nav entries). Either column falls through to its
  // legacy hardcoded content when the NavMenu row is absent.
  const [footer1Items, footer2Items] = await Promise.all([
    loadNavItems("footer-1"),
    loadNavItems("footer-2"),
  ]);
  const footer1 = footer1Items
    ? expandAutoItems(footer1Items, { navPages })
    : null;
  const footer2 = footer2Items
    ? expandAutoItems(footer2Items, { navPages })
    : null;

  return (
    <footer
      style={{
        borderTop: "1px solid var(--color-border)",
        padding: "4rem 0 2.5rem",
        marginTop: "6rem",
        background: "var(--color-surface)",
        color: "var(--color-text)",
      }}
    >
      <div
        className="container"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "2.5rem",
          marginBottom: "3rem",
        }}
      >
        <div style={{ maxWidth: 320 }}>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "1.25rem",
              fontWeight: 700,
              marginBottom: "0.5rem",
            }}
          >
            {name}
          </div>
          {brandingTagline(site.branding) && (
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--color-muted)",
                lineHeight: 1.5,
              }}
            >
              {brandingTagline(site.branding)}
            </p>
          )}
          <SocialsRow socials={socials} />
        </div>

        <FooterColumn
          heading="Shop"
          items={footer1}
          fallback={
            <>
              <li>
                <Link href="/products">All products</Link>
              </li>
              <li>
                <Link href="/blog">Journal</Link>
              </li>
              <li>
                <Link href="/contact">Contact</Link>
              </li>
            </>
          }
        />

        {footer2 ? (
          <FooterColumn heading="More" items={footer2} />
        ) : navPages.length > 0 ? (
          <FooterColumn
            heading="About"
            items={null}
            fallback={navPages.map((p) => (
              <li key={p.id}>
                <Link href={`/${p.slug}`}>{p.title}</Link>
              </li>
            ))}
          />
        ) : null}

        {(contact.email || contact.phone || contact.address) && (
          <div>
            <h4
              style={{
                fontSize: "0.72rem",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--color-muted)",
                marginBottom: "1rem",
                fontWeight: 600,
              }}
            >
              Contact
            </h4>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                fontSize: "0.9rem",
                color: "var(--color-muted)",
              }}
            >
              {contact.email && (
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`}>{contact.phone}</a>
              )}
              {contact.address && <span>{contact.address}</span>}
            </div>
          </div>
        )}
      </div>
      <div
        className="container"
        style={{
          borderTop: "1px solid var(--color-border)",
          paddingTop: "1.5rem",
          fontSize: "0.8rem",
          color: "var(--color-muted)",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <span>
          © {new Date().getFullYear()} {name}
        </span>
        <span>All rights reserved.</span>
      </div>
    </footer>
  );
}

// ============================================================================
// Section primitives (Phase C.4)
//
// Composable building blocks used by the 10 bespoke template layouts. Each
// one reads from the design tokens, respects `--section-padding`, and is
// intentionally style-light so individual templates can wrap them in
// their own `data-template="..."` scope and recolor via CSS.
// ============================================================================

export function TrustStrip({
  items,
  dark = false,
}: {
  items: { label: string; value: string }[];
  dark?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section
      style={{
        padding: "2.5rem 0",
        borderTop: "1px solid var(--color-border)",
        borderBottom: "1px solid var(--color-border)",
        background: dark ? "var(--color-text)" : "var(--color-surface)",
        color: dark ? "var(--color-background)" : "var(--color-text)",
      }}
    >
      <div
        className="container"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(160px, 1fr))`,
          gap: "2rem",
          textAlign: "center",
        }}
      >
        {items.map((i) => (
          <div key={i.label}>
            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: 600,
                letterSpacing: "-0.01em",
                fontFamily: "var(--font-display)",
                lineHeight: 1.1,
              }}
            >
              {i.value}
            </div>
            <div
              style={{
                fontSize: "0.72rem",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                marginTop: "0.35rem",
                opacity: 0.65,
              }}
            >
              {i.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CategoryTiles({
  categories,
  columns = 3,
  aspectRatio = "4/5",
  heading = "Shop by category",
}: {
  categories: PublicCategory[];
  columns?: number;
  aspectRatio?: string;
  heading?: string;
}) {
  if (categories.length === 0) return null;
  const shown = categories.slice(0, columns * 2);
  return (
    <section style={{ padding: "var(--section-padding) 0" }}>
      <div className="container">
        <h2
          style={{
            fontSize: "clamp(1.75rem, 2.5vw, 2.25rem)",
            marginBottom: "2.5rem",
            textAlign: "center",
            fontFamily: "var(--font-heading)",
          }}
        >
          {heading}
        </h2>
        <div
          className="tpl-stack"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fit, minmax(min(260px, 100%), 1fr))`,
            gap: "1.25rem",
          }}
        >
          {shown.map((c) => (
            <Link
              key={c.id}
              href={`/products?categoryId=${c.id}`}
              style={{
                position: "relative",
                display: "block",
                aspectRatio,
                background:
                  "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.55) 100%), var(--color-surface)",
                color: "white",
                borderRadius: "var(--radius)",
                overflow: "hidden",
                border: "1px solid var(--color-border)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: "1.25rem",
                  right: "1.25rem",
                  bottom: "1.25rem",
                }}
              >
                <div
                  style={{
                    fontSize: "1.35rem",
                    fontFamily: "var(--font-heading)",
                    fontWeight: 600,
                    marginBottom: "0.25rem",
                  }}
                >
                  {c.name}
                </div>
                {c.description && (
                  <div
                    style={{
                      fontSize: "0.8rem",
                      opacity: 0.85,
                      lineHeight: 1.4,
                    }}
                  >
                    {c.description}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StorySplit({
  eyebrow,
  title,
  body,
  imageSide = "left",
  imageCaption,
  cta,
}: {
  eyebrow?: string;
  title: string;
  body: string;
  imageSide?: "left" | "right";
  imageCaption?: string;
  cta?: { href: string; label: string };
}) {
  const imageBlock = (
    <div
      style={{
        aspectRatio: "4/5",
        background:
          "linear-gradient(135deg, var(--color-surface), var(--color-accent))",
        borderRadius: "var(--radius)",
        display: "flex",
        alignItems: "flex-end",
        padding: "1.5rem",
        fontSize: "0.8rem",
        color: "var(--color-muted)",
        border: "1px solid var(--color-border)",
      }}
    >
      {imageCaption ?? ""}
    </div>
  );
  const textBlock = (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {eyebrow && (
        <div
          style={{
            fontSize: "0.72rem",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--color-muted)",
          }}
        >
          {eyebrow}
        </div>
      )}
      <h2
        style={{
          fontSize: "clamp(1.875rem, 3vw, 2.5rem)",
          lineHeight: 1.2,
          margin: 0,
          fontFamily: "var(--font-display)",
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontSize: "1.05rem",
          lineHeight: 1.75,
          color: "var(--color-muted)",
          margin: 0,
          whiteSpace: "pre-line",
        }}
      >
        {body}
      </p>
      {cta && (
        <div>
          <Link href={cta.href} className="btn btn-outline">
            {cta.label}
          </Link>
        </div>
      )}
    </div>
  );
  return (
    <section style={{ padding: "var(--section-padding) 0" }}>
      <div
        className="container"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "3rem",
          alignItems: "center",
        }}
      >
        {imageSide === "left" ? imageBlock : textBlock}
        {imageSide === "left" ? textBlock : imageBlock}
      </div>
    </section>
  );
}

export function BentoShowcase({
  products,
  heading,
  eyebrow,
  formatOpts,
}: {
  products: PublicProduct[];
  heading?: string;
  eyebrow?: string;
  formatOpts?: import("@/lib/format").FormatPriceOptions;
}) {
  if (products.length === 0) return null;
  const featured = products.slice(0, 5);
  const [big, ...small] = featured;

  return (
    <section style={{ padding: "var(--section-padding) 0" }}>
      <div className="container">
        {(eyebrow || heading) && (
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            {eyebrow && (
              <div
                style={{
                  fontSize: "0.72rem",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "var(--color-muted)",
                  marginBottom: "0.5rem",
                }}
              >
                {eyebrow}
              </div>
            )}
            {heading && (
              <h2
                style={{
                  fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                  margin: 0,
                  fontFamily: "var(--font-display)",
                }}
              >
                {heading}
              </h2>
            )}
          </div>
        )}
        <div
          className="tpl-stack"
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr",
            gridTemplateRows: "1fr 1fr",
            gap: "1rem",
            minHeight: 560,
          }}
        >
          {big && (
            <Link
              href={`/products/${big.id}`}
              style={{
                gridRow: "span 2",
                background: big.photoUrl
                  ? `linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.65) 100%), url("${big.photoUrl}") center/cover no-repeat`
                  : "linear-gradient(135deg, var(--color-surface), var(--color-accent))",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius)",
                padding: "2rem",
                display: "flex",
                alignItems: "flex-end",
                color: big.photoUrl ? "white" : "var(--color-text)",
                position: "relative",
                overflow: "hidden",
                minHeight: 280,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    opacity: 0.8,
                    marginBottom: "0.5rem",
                  }}
                >
                  Featured
                </div>
                <div
                  style={{
                    fontSize: "1.75rem",
                    fontWeight: 600,
                    fontFamily: "var(--font-display)",
                    marginBottom: "0.35rem",
                    lineHeight: 1.15,
                  }}
                >
                  {big.name}
                </div>
                <div
                  style={{
                    fontSize: "0.9rem",
                    opacity: 0.85,
                  }}
                >
                  {formatPriceShared(big.finalSp, formatOpts)}
                </div>
              </div>
            </Link>
          )}
          {small.map((p) => (
            <Link
              key={p.id}
              href={`/products/${p.id}`}
              style={{
                background: p.photoUrl
                  ? `linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.65) 100%), url("${p.photoUrl}") center/cover no-repeat`
                  : "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius)",
                padding: "1.25rem",
                display: "flex",
                alignItems: "flex-end",
                color: p.photoUrl ? "white" : "var(--color-text)",
                overflow: "hidden",
                minHeight: 160,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 500,
                    marginBottom: "0.2rem",
                  }}
                >
                  {p.name}
                </div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    opacity: 0.85,
                  }}
                >
                  {formatPriceShared(p.finalSp, formatOpts)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StatsBand({
  items,
  dark = false,
}: {
  items: { value: string; label: string }[];
  dark?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section
      style={{
        padding: "3.5rem 0",
        background: dark ? "var(--color-text)" : "var(--color-surface)",
        color: dark ? "var(--color-background)" : "var(--color-text)",
      }}
    >
      <div
        className="container"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(180px, 1fr))`,
          gap: "2rem",
          textAlign: "center",
        }}
      >
        {items.map((i) => (
          <div key={i.label}>
            <div
              style={{
                fontSize: "clamp(2rem, 4vw, 2.75rem)",
                fontWeight: 700,
                lineHeight: 1,
                marginBottom: "0.6rem",
                fontFamily: "var(--font-display)",
              }}
            >
              {i.value}
            </div>
            <div
              style={{
                fontSize: "0.8rem",
                opacity: 0.7,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
              }}
            >
              {i.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function NewsletterBand({
  title = "Stay in the loop",
  subtitle = "Occasional updates — no spam, ever.",
  cta = "Subscribe",
  variant = "inline",
  dark = false,
}: {
  title?: string;
  subtitle?: string;
  cta?: string;
  /**
   * Visual presentation. `inline` is the original full-bleed band,
   * `card` floats a bordered card on the page background, `banner` is
   * a compact high-contrast strip with the form inline beside the copy.
   * `modal` is handled by the NewsletterBlock router — it never reaches
   * this component.
   */
  variant?: "inline" | "card" | "banner";
  dark?: boolean;
}) {
  const bg = dark
    ? "var(--color-text)"
    : variant === "card"
      ? "var(--color-background)"
      : "var(--color-surface)";
  const fg = dark ? "var(--color-background)" : "var(--color-text)";
  const mutedFg = dark ? "var(--color-background)" : "var(--color-muted)";
  const sectionStyle: React.CSSProperties =
    variant === "card"
      ? {
          padding: "var(--section-padding) 0",
          background: "var(--color-background)",
        }
      : variant === "banner"
        ? {
            padding: "2rem 0",
            background: bg,
            color: fg,
            borderTop: dark ? "none" : "1px solid var(--color-border)",
            borderBottom: dark ? "none" : "1px solid var(--color-border)",
          }
        : {
            padding: "var(--section-padding) 0",
            background: bg,
            color: fg,
            borderTop: "1px solid var(--color-border)",
            borderBottom: "1px solid var(--color-border)",
          };

  const inner =
    variant === "banner" ? (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "2rem",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        <div style={{ flex: "1 1 240px", minWidth: 240 }}>
          <h2
            style={{
              fontSize: "clamp(1.15rem, 1.75vw, 1.5rem)",
              margin: "0 0 0.25rem",
              fontFamily: "var(--font-display)",
              color: fg,
            }}
          >
            {title}
          </h2>
          <p
            style={{
              color: mutedFg,
              margin: 0,
              opacity: dark ? 0.8 : 1,
              fontSize: "0.9rem",
            }}
          >
            {subtitle}
          </p>
        </div>
        <form
          method="get"
          action=""
          style={{
            display: "flex",
            gap: "0.5rem",
            flex: "1 1 320px",
            minWidth: 280,
            maxWidth: 440,
          }}
        >
          <label htmlFor="newsletter-email-banner" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter-email-banner"
            name="newsletter_email"
            type="email"
            placeholder="Enter your email"
            style={{
              height: 44,
              padding: "0 1rem",
              border: dark
                ? "1px solid rgba(255,255,255,0.25)"
                : "1px solid var(--color-border)",
              borderRadius: "var(--radius, 6px)",
              background: dark
                ? "rgba(255,255,255,0.08)"
                : "var(--color-background)",
              color: fg,
              fontSize: "0.9rem",
              flex: 1,
              minWidth: 0,
              outline: "none",
            }}
          />
          <button
            type="submit"
            style={{
              height: 44,
              padding: "0 1.5rem",
              background: dark
                ? "var(--color-background)"
                : "var(--color-primary)",
              color: dark
                ? "var(--color-text)"
                : "var(--color-on-primary, #fff)",
              border: "none",
              borderRadius: "var(--radius, 6px)",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {cta}
          </button>
        </form>
      </div>
    ) : (
      <div
        style={
          variant === "card"
            ? {
                maxWidth: 640,
                margin: "0 auto",
                background: dark ? "var(--color-text)" : "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius, 12px)",
                padding: "3rem 2rem",
                textAlign: "center",
                color: fg,
              }
            : { maxWidth: 580, textAlign: "center", color: fg }
        }
      >
        <h2
          style={{
            fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
            marginBottom: "0.75rem",
            fontFamily: "var(--font-display)",
            color: fg,
          }}
        >
          {title}
        </h2>
        <p
          style={{
            color: mutedFg,
            marginBottom: "1.75rem",
            lineHeight: 1.6,
            opacity: dark ? 0.8 : 1,
          }}
        >
          {subtitle}
        </p>
        {/*
          Decorative form: real subscription wiring lands in a later phase.
          No onSubmit handler so this stays server-compatible; form posts
          back to the current URL and does nothing visible.
        */}
        <form
          method="get"
          action=""
          style={{
            display: "flex",
            gap: "0.5rem",
            maxWidth: 440,
            margin: "0 auto",
          }}
        >
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter-email"
            name="newsletter_email"
            type="email"
            placeholder="Enter your email"
            style={{
              height: 44,
              padding: "0 1rem",
              border: dark
                ? "1px solid rgba(255,255,255,0.25)"
                : "1px solid var(--color-border)",
              borderRadius: "var(--radius, 6px)",
              background: dark
                ? "rgba(255,255,255,0.08)"
                : "var(--color-background)",
              color: fg,
              fontSize: "0.9rem",
              flex: 1,
              minWidth: 0,
              outline: "none",
            }}
          />
          <button
            type="submit"
            style={{
              height: 44,
              padding: "0 1.5rem",
              background: dark
                ? "var(--color-background)"
                : "var(--color-primary)",
              color: dark
                ? "var(--color-text)"
                : "var(--color-on-primary, #fff)",
              border: "none",
              borderRadius: "var(--radius, 6px)",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {cta}
          </button>
        </form>
      </div>
    );

  return (
    <section style={sectionStyle}>
      <div className="container">{inner}</div>
    </section>
  );
}

// ============================================================================
// Product detail
// ============================================================================

export function ProductDetail({
  product,
  formatOpts,
}: {
  product: PublicProduct;
  formatOpts?: import("@/lib/format").FormatPriceOptions;
}) {
  return (
    <section style={{ padding: "var(--section-padding) 0" }}>
      <div
        className="container tpl-stack"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: "3rem",
          alignItems: "start",
        }}
      >
        <div
          style={{
            position: "relative",
            aspectRatio: "1 / 1",
            background: "var(--color-surface)",
            borderRadius: "var(--radius)",
            border: "1px solid var(--color-border)",
            overflow: "hidden",
          }}
        >
          {product.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.photoUrl}
              alt=""
              aria-hidden="true"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              sizes="(max-width: 768px) 100vw, 50vw"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.85rem",
                color: "var(--color-muted)",
              }}
            >
              {product.imsCode}
            </div>
          )}
        </div>
        <div>
          {product.category && (
            <div
              style={{
                color: "var(--color-muted)",
                fontSize: "0.72rem",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                marginBottom: "0.75rem",
              }}
            >
              {product.category.name}
            </div>
          )}
          <h1
            style={{
              fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
              marginBottom: "1.25rem",
              fontFamily: "var(--font-heading)",
              lineHeight: 1.15,
            }}
          >
            {product.name}
          </h1>
          <PdpBuyboxClient
            productId={product.id}
            productName={product.name}
            baseUnitPrice={Number(product.finalSp)}
            baseMrp={Number(product.mrp)}
            imageUrl={product.photoUrl ?? null}
            baseSku={product.imsCode}
            variations={product.variations ?? []}
            showSku
            showVariantPicker
            variantDisplay="chips"
            priceSize="md"
            locale={formatOpts?.locale}
            currency={formatOpts?.currency}
          />
          {product.description && (
            <p
              style={{
                lineHeight: 1.7,
                color: "var(--color-text)",
                opacity: 0.85,
                marginTop: "2rem",
                paddingTop: "1.5rem",
                borderTop: "1px solid var(--color-border)",
              }}
            >
              {product.description}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
