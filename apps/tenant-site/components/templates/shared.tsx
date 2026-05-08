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
import { formatPrice as formatPriceShared } from "@/lib/format";
import type { NavConfig, NavItem, FooterConfig } from "@repo/shared";
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

// ============================================================================
// Brand + header
// ============================================================================

export function BrandMark({
  site,
  host,
  navConfig,
}: {
  site: PublicSite;
  host: string;
  navConfig?: NavConfig;
}) {
  // Prefer navConfig logo first (tenant-authored), then TenantBusinessProfile,
  // then legacy branding JSON.
  const bp = site.businessProfile;
  const name =
    bp?.displayName?.trim() || brandingDisplayName(site.branding, host);

  // Prefer navConfig.logo if it exists
  let logo = navConfig?.logo?.url?.trim();
  if (!logo) {
    // Fall back to business profile logo
    logo = bp?.logoUrl?.trim() || brandingLogoUrl(site.branding) || undefined;
  }
  const logoAlt = navConfig?.logo?.alt ?? "";

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
          alt={logoAlt}
          aria-hidden={!logoAlt}
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
    mapUrl: bp?.mapUrl?.trim() || legacyContact.mapUrl,
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
