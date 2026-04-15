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

// ============================================================================
// Brand + header
// ============================================================================

export function BrandMark({ site, host }: { site: PublicSite; host: string }) {
  const name = brandingDisplayName(site.branding, host);
  const logo = brandingLogoUrl(site.branding);
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
        {}
        <img
          src={logo}
          alt={name}
          style={{ height: 36, width: "auto", display: "block" }}
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

export function SiteHeader({
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
            style={{
              display: "flex",
              gap: "1.5rem",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {links.map((l) => (
              <Link key={l.href} href={l.href} style={navLinkStyle}>
                {l.label}
              </Link>
            ))}
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
          className="container"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: "2rem",
          }}
        >
          <nav style={{ display: "flex", gap: "1.5rem" }}>
            {left.map((l) => (
              <Link key={l.href} href={l.href} style={navLinkStyle}>
                {l.label}
              </Link>
            ))}
          </nav>
          <BrandMark site={site} host={host} />
          <nav
            style={{
              display: "flex",
              gap: "1.5rem",
              justifyContent: "flex-end",
            }}
          >
            {right.map((l) => (
              <Link key={l.href} href={l.href} style={navLinkStyle}>
                {l.label}
              </Link>
            ))}
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
          gap: "2rem",
        }}
      >
        <BrandMark site={site} host={host} />
        <nav
          style={{
            display: "flex",
            gap: "1.75rem",
            alignItems: "center",
          }}
        >
          {links.map((l) => (
            <Link key={l.href} href={l.href} style={navLinkStyle}>
              {l.label}
            </Link>
          ))}
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
  | "editorial";

export function Hero({
  site,
  host,
  variant = "standard",
  ctaHref = "/products",
  ctaLabel = "Shop the collection",
}: {
  site: PublicSite;
  host: string;
  variant?: HeroVariant;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  const name = brandingDisplayName(site.branding, host);
  const tagline = brandingTagline(site.branding);

  const padding =
    variant === "minimal"
      ? "5rem 0 4rem"
      : variant === "luxury"
        ? "8rem 0 7rem"
        : variant === "boutique"
          ? "6rem 0 5rem"
          : variant === "editorial"
            ? "7rem 0 5rem"
            : "5.5rem 0 4.5rem";

  const fontSize =
    variant === "luxury"
      ? "clamp(3rem, 6vw, 4.5rem)"
      : variant === "editorial"
        ? "clamp(2.75rem, 5vw, 4rem)"
        : "clamp(2.25rem, 4.5vw, 3.25rem)";

  const letterSpacing =
    variant === "minimal"
      ? "-0.03em"
      : variant === "luxury"
        ? "0.02em"
        : "-0.01em";

  const fontWeight =
    variant === "minimal" ? 500 : variant === "luxury" ? 500 : 700;

  const fontFamily = "var(--font-display)";

  return (
    <section
      style={{
        padding,
        textAlign: "center",
        background: "var(--color-background)",
      }}
    >
      <div className="container" style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1
          style={{
            fontSize,
            marginBottom: "1.25rem",
            letterSpacing,
            fontWeight,
            fontFamily,
            lineHeight: 1.1,
            color: "var(--color-text)",
          }}
        >
          {name}
        </h1>
        {tagline && (
          <p
            style={{
              fontSize: "clamp(1rem, 1.5vw, 1.2rem)",
              color: "var(--color-muted)",
              maxWidth: 560,
              margin: "0 auto 2rem",
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
      </div>
    </section>
  );
}

// ============================================================================
// Products
// ============================================================================

export function ProductCard({
  product,
  variant = "bordered",
}: {
  product: PublicProduct;
  variant?: "bordered" | "bare" | "card";
}) {
  const hasDiscount =
    product.finalSp &&
    product.mrp &&
    Number(product.finalSp) < Number(product.mrp);

  const border =
    variant === "bare"
      ? "none"
      : variant === "card"
        ? "none"
        : "1px solid var(--color-border)";
  const background =
    variant === "card" ? "var(--color-surface)" : "transparent";
  const boxShadow = variant === "card" ? "0 1px 2px rgba(0,0,0,0.04)" : "none";

  return (
    <Link
      href={`/products/${product.id}`}
      style={{
        display: "block",
        borderRadius: "var(--radius)",
        border,
        background,
        boxShadow,
        overflow: "hidden",
        color: "var(--color-text)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
    >
      <div
        style={{
          aspectRatio: "1 / 1",
          background: "var(--color-surface)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.75rem",
          color: "var(--color-muted)",
          fontFamily: "var(--font-heading)",
          letterSpacing: "0.05em",
        }}
      >
        {product.imsCode}
      </div>
      <div style={{ padding: "1rem 1.1rem 1.2rem" }}>
        <div
          style={{
            fontWeight: 500,
            marginBottom: "0.4rem",
            fontSize: "0.98rem",
            lineHeight: 1.35,
          }}
        >
          {product.name}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "0.6rem",
            fontSize: "0.95rem",
          }}
        >
          <span
            style={{
              fontWeight: 600,
              color: "var(--color-text)",
            }}
          >
            ₹{Number(product.finalSp).toLocaleString("en-IN")}
          </span>
          {hasDiscount && (
            <span
              style={{
                textDecoration: "line-through",
                color: "var(--color-muted)",
                fontSize: "0.85rem",
              }}
            >
              ₹{Number(product.mrp).toLocaleString("en-IN")}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({
  products,
  columns = 4,
  variant = "bordered",
}: {
  products: PublicProduct[];
  columns?: number;
  variant?: "bordered" | "bare" | "card";
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
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(${Math.max(180, Math.floor(1200 / columns) - 20)}px, 1fr))`,
        gap: "1.75rem",
      }}
    >
      {products.map((p) => (
        <ProductCard key={p.id} product={p} variant={variant} />
      ))}
    </div>
  );
}

// ============================================================================
// Contact + footer
// ============================================================================

export function ContactBlock({ site }: { site: PublicSite }) {
  const contact = (site.contact ?? {}) as {
    email?: string;
    phone?: string;
    address?: string;
    mapUrl?: string;
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

export function SiteFooter({
  site,
  host,
  navPages = [],
}: {
  site: PublicSite;
  host: string;
  navPages?: PublicNavPage[];
}) {
  const name = brandingDisplayName(site.branding, host);
  const contact = (site.contact ?? {}) as {
    email?: string;
    phone?: string;
    address?: string;
  };

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
        </div>

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
            Shop
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
            <li>
              <Link href="/products">All products</Link>
            </li>
            <li>
              <Link href="/blog">Journal</Link>
            </li>
            <li>
              <Link href="/contact">Contact</Link>
            </li>
          </ul>
        </div>

        {navPages.length > 0 && (
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
              About
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
              {navPages.map((p) => (
                <li key={p.id}>
                  <Link href={`/${p.slug}`}>{p.title}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}

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
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
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
}: {
  products: PublicProduct[];
  heading?: string;
  eyebrow?: string;
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
                background:
                  "linear-gradient(135deg, var(--color-surface), var(--color-accent))",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius)",
                padding: "2rem",
                display: "flex",
                alignItems: "flex-end",
                color: "var(--color-text)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "var(--color-muted)",
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
                    color: "var(--color-muted)",
                  }}
                >
                  ₹{Number(big.finalSp).toLocaleString("en-IN")}
                </div>
              </div>
            </Link>
          )}
          {small.map((p) => (
            <Link
              key={p.id}
              href={`/products/${p.id}`}
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius)",
                padding: "1.25rem",
                display: "flex",
                alignItems: "flex-end",
                color: "var(--color-text)",
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
                    color: "var(--color-muted)",
                  }}
                >
                  ₹{Number(p.finalSp).toLocaleString("en-IN")}
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
}: {
  title?: string;
  subtitle?: string;
  cta?: string;
}) {
  return (
    <section
      style={{
        padding: "var(--section-padding) 0",
        background: "var(--color-surface)",
        borderTop: "1px solid var(--color-border)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div className="container" style={{ maxWidth: 580, textAlign: "center" }}>
        <h2
          style={{
            fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
            marginBottom: "0.75rem",
            fontFamily: "var(--font-display)",
          }}
        >
          {title}
        </h2>
        <p
          style={{
            color: "var(--color-muted)",
            marginBottom: "1.75rem",
            lineHeight: 1.6,
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
            placeholder="you@example.com"
            style={{
              flex: 1,
              padding: "0.85rem 1.1rem",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius)",
              fontSize: "0.95rem",
              background: "var(--color-background)",
              color: "var(--color-text)",
              fontFamily: "inherit",
            }}
          />
          <button type="submit" className="btn">
            {cta}
          </button>
        </form>
      </div>
    </section>
  );
}

// ============================================================================
// Product detail
// ============================================================================

export function ProductDetail({ product }: { product: PublicProduct }) {
  return (
    <section style={{ padding: "var(--section-padding) 0" }}>
      <div
        className="container"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: "3rem",
          alignItems: "start",
        }}
      >
        <div
          style={{
            aspectRatio: "1 / 1",
            background: "var(--color-surface)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.85rem",
            color: "var(--color-muted)",
            borderRadius: "var(--radius)",
            border: "1px solid var(--color-border)",
          }}
        >
          {product.imsCode}
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
              marginBottom: "1rem",
              fontFamily: "var(--font-heading)",
              lineHeight: 1.15,
            }}
          >
            {product.name}
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "0.75rem",
              fontSize: "1.35rem",
              marginBottom: "2rem",
            }}
          >
            <span style={{ fontWeight: 700 }}>
              ₹{Number(product.finalSp).toLocaleString("en-IN")}
            </span>
            {Number(product.finalSp) < Number(product.mrp) && (
              <span
                style={{
                  textDecoration: "line-through",
                  color: "var(--color-muted)",
                  fontSize: "1rem",
                }}
              >
                ₹{Number(product.mrp).toLocaleString("en-IN")}
              </span>
            )}
          </div>
          {product.description && (
            <p
              style={{
                lineHeight: 1.7,
                color: "var(--color-text)",
                opacity: 0.85,
                marginBottom: "2rem",
              }}
            >
              {product.description}
            </p>
          )}
          <a
            href={`mailto:orders@${(product.id ?? "").slice(0, 4)}?subject=${encodeURIComponent(
              product.name,
            )}`}
            className="btn"
          >
            Enquire about this piece
          </a>
        </div>
      </div>
    </section>
  );
}
