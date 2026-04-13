/**
 * Shared sub-components used across all four template layouts. Each template
 * can override any of these by composing the parts differently, but for now
 * a shared header/footer/card keeps the code manageable and the diff
 * between templates is mostly in layout + type + color choices.
 */

import type { PublicProduct, PublicSite, PublicCategory } from "@/lib/api";
import {
  brandingDisplayName,
  brandingTagline,
  brandingLogoUrl,
} from "@/lib/theme";
import Link from "next/link";

export function BrandMark({ site, host }: { site: PublicSite; host: string }) {
  const name = brandingDisplayName(site.branding, host);
  const logo = brandingLogoUrl(site.branding);
  if (logo) {
    return (
      <Link
        href="/"
        style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
      >
        <img src={logo} alt={name} style={{ height: 32, width: "auto" }} />
        <span style={{ fontWeight: 600 }}>{name}</span>
      </Link>
    );
  }
  return (
    <Link href="/" style={{ fontWeight: 700, fontSize: "1.25rem" }}>
      {name}
    </Link>
  );
}

export function SiteHeader({
  site,
  host,
  categories,
}: {
  site: PublicSite;
  host: string;
  categories: PublicCategory[];
}) {
  return (
    <header
      style={{
        borderBottom: "1px solid rgba(128,128,128,0.15)",
        padding: "1.25rem 0",
      }}
    >
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
            gap: "1.5rem",
            fontSize: "0.95rem",
          }}
        >
          <Link href="/">Home</Link>
          <Link href="/products">Products</Link>
          {categories.length > 0 && <Link href="/products">Categories</Link>}
          <Link href="/contact">Contact</Link>
        </nav>
      </div>
    </header>
  );
}

export function Hero({
  site,
  host,
  variant = "standard",
}: {
  site: PublicSite;
  host: string;
  variant?: "minimal" | "standard" | "luxury" | "boutique";
}) {
  const name = brandingDisplayName(site.branding, host);
  const tagline = brandingTagline(site.branding);
  const padding =
    variant === "minimal"
      ? "4rem 0 3rem"
      : variant === "luxury"
        ? "8rem 0 6rem"
        : variant === "boutique"
          ? "6rem 0 5rem"
          : "5rem 0 4rem";

  return (
    <section style={{ padding, textAlign: "center" }}>
      <div className="container">
        <h1
          style={{
            fontSize: variant === "luxury" ? "4rem" : "3rem",
            marginBottom: "1rem",
            letterSpacing: variant === "minimal" ? "-0.02em" : undefined,
          }}
        >
          {name}
        </h1>
        {tagline && (
          <p style={{ fontSize: "1.25rem", opacity: 0.75 }}>{tagline}</p>
        )}
        <div style={{ marginTop: "2rem" }}>
          <Link href="/products" className="btn">
            Shop now
          </Link>
        </div>
      </div>
    </section>
  );
}

export function ProductCard({ product }: { product: PublicProduct }) {
  const hasDiscount =
    product.finalSp &&
    product.mrp &&
    Number(product.finalSp) < Number(product.mrp);
  return (
    <Link
      href={`/products/${product.id}`}
      style={{
        display: "block",
        borderRadius: 8,
        border: "1px solid rgba(128,128,128,0.15)",
        overflow: "hidden",
        transition: "transform 0.15s",
      }}
    >
      <div
        style={{
          aspectRatio: "1 / 1",
          background: "rgba(128,128,128,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.85rem",
          opacity: 0.5,
        }}
      >
        {product.imsCode}
      </div>
      <div style={{ padding: "1rem" }}>
        <div style={{ fontWeight: 500, marginBottom: "0.25rem" }}>
          {product.name}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "0.5rem",
            fontSize: "0.95rem",
          }}
        >
          <span style={{ fontWeight: 600 }}>
            ₹{Number(product.finalSp).toLocaleString("en-IN")}
          </span>
          {hasDiscount && (
            <span style={{ textDecoration: "line-through", opacity: 0.5 }}>
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
}: {
  products: PublicProduct[];
  columns?: number;
}) {
  if (products.length === 0) {
    return (
      <p
        style={{
          textAlign: "center",
          padding: "3rem 0",
          opacity: 0.6,
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
        gridTemplateColumns: `repeat(auto-fit, minmax(${Math.floor(1200 / columns) - 20}px, 1fr))`,
        gap: "1.5rem",
      }}
    >
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

export function ContactBlock({ site }: { site: PublicSite }) {
  const contact = (site.contact ?? {}) as {
    email?: string;
    phone?: string;
    address?: string;
    mapUrl?: string;
  };
  if (!contact.email && !contact.phone && !contact.address) {
    return null;
  }
  return (
    <section style={{ padding: "4rem 0" }}>
      <div className="container">
        <h2 style={{ fontSize: "2rem", marginBottom: "2rem" }}>Contact us</h2>
        <dl style={{ display: "grid", gap: "1rem", maxWidth: 500 }}>
          {contact.email && (
            <div>
              <dt style={{ opacity: 0.6, fontSize: "0.85rem" }}>Email</dt>
              <dd>
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </dd>
            </div>
          )}
          {contact.phone && (
            <div>
              <dt style={{ opacity: 0.6, fontSize: "0.85rem" }}>Phone</dt>
              <dd>
                <a href={`tel:${contact.phone}`}>{contact.phone}</a>
              </dd>
            </div>
          )}
          {contact.address && (
            <div>
              <dt style={{ opacity: 0.6, fontSize: "0.85rem" }}>Address</dt>
              <dd>{contact.address}</dd>
            </div>
          )}
        </dl>
      </div>
    </section>
  );
}

export function SiteFooter({ site, host }: { site: PublicSite; host: string }) {
  const name = brandingDisplayName(site.branding, host);
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(128,128,128,0.15)",
        padding: "2rem 0",
        marginTop: "4rem",
        textAlign: "center",
        fontSize: "0.85rem",
        opacity: 0.7,
      }}
    >
      <div className="container">
        © {new Date().getFullYear()} {name}
      </div>
    </footer>
  );
}

export function ProductDetail({ product }: { product: PublicProduct }) {
  return (
    <section style={{ padding: "3rem 0" }}>
      <div
        className="container"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "3rem",
        }}
      >
        <div
          style={{
            aspectRatio: "1 / 1",
            background: "rgba(128,128,128,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1rem",
            opacity: 0.5,
            borderRadius: 8,
          }}
        >
          {product.imsCode}
        </div>
        <div>
          <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
            {product.name}
          </h1>
          {product.category && (
            <div
              style={{
                opacity: 0.6,
                fontSize: "0.85rem",
                marginBottom: "1rem",
              }}
            >
              {product.category.name}
            </div>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "0.75rem",
              fontSize: "1.5rem",
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
                  opacity: 0.5,
                  fontSize: "1.1rem",
                }}
              >
                ₹{Number(product.mrp).toLocaleString("en-IN")}
              </span>
            )}
          </div>
          {product.description && (
            <p style={{ lineHeight: 1.6, opacity: 0.85 }}>
              {product.description}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
