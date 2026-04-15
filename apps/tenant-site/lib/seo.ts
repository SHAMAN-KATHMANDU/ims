/**
 * SEO helpers — shared metadata and JSON-LD generators for the tenant-site
 * renderer. Pages call these from their `generateMetadata` and embed the
 * JSON-LD via a `<script type="application/ld+json">` tag.
 *
 * We keep these tenant-aware (brand name, site URL, logo) but avoid making
 * any network calls inside the helpers — the caller passes in the data
 * already fetched for the page so we don't double-fetch from metadata.
 */

import type { Metadata } from "next";
import type { PublicSite, PublicProduct, PublicBlogPost } from "./api";
import { brandingDisplayName, brandingTagline, brandingLogoUrl } from "./theme";

function siteName(site: PublicSite, host: string): string {
  return brandingDisplayName(site.branding, host);
}

function seoField(
  site: PublicSite,
  key: "title" | "description" | "ogImage",
): string | undefined {
  const seo = (site.seo ?? {}) as Record<string, unknown>;
  const val = seo[key];
  return typeof val === "string" && val.trim().length > 0 ? val : undefined;
}

// ---------------------------------------------------------------------------
// Metadata generators
// ---------------------------------------------------------------------------

export function homeMetadata(site: PublicSite, host: string): Metadata {
  const name = siteName(site, host);
  const title = seoField(site, "title") ?? name;
  const description =
    seoField(site, "description") ??
    brandingTagline(site.branding) ??
    `${name} — shop online`;
  const url = `https://${host}`;
  const ogImage = seoField(site, "ogImage") ?? brandingLogoUrl(site.branding);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: name,
      title,
      description,
      url,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export function productMetadata(
  product: PublicProduct,
  site: PublicSite,
  host: string,
): Metadata {
  const name = siteName(site, host);
  const url = `https://${host}/products/${product.id}`;
  const description =
    product.description ??
    seoField(site, "description") ??
    `${product.name} — ${name}`;
  const images =
    product.photoUrls && product.photoUrls.length > 0
      ? product.photoUrls
      : product.photoUrl
        ? [product.photoUrl]
        : undefined;
  return {
    title: `${product.name} · ${name}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: name,
      title: product.name,
      description,
      url,
      images: images?.map((url) => ({ url })),
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images,
    },
  };
}

export function blogPostMetadata(
  post: PublicBlogPost,
  site: PublicSite,
  host: string,
): Metadata {
  const name = siteName(site, host);
  const url = `https://${host}/blog/${post.slug}`;
  const description = post.seoDescription ?? post.excerpt ?? undefined;
  const image = post.heroImageUrl ?? undefined;
  return {
    title: post.seoTitle ?? `${post.title} · ${name}`,
    description: description ?? undefined,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      siteName: name,
      title: post.title,
      description: description ?? undefined,
      url,
      images: image ? [{ url: image }] : undefined,
      publishedTime: post.publishedAt ?? undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: description ?? undefined,
      images: image ? [image] : undefined,
    },
  };
}

// ---------------------------------------------------------------------------
// JSON-LD
// ---------------------------------------------------------------------------

/**
 * Organization + WebSite JSON-LD — emit once per site, usually in the
 * root layout. The WebSite node enables Google's sitelinks search box
 * when a site has a /search URL pattern (we don't yet; placeholder omitted).
 */
export function organizationJsonLd(site: PublicSite, host: string): string {
  const name = siteName(site, host);
  const logo = brandingLogoUrl(site.branding);
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `https://${host}/#organization`,
        name,
        url: `https://${host}`,
        ...(logo ? { logo } : {}),
      },
      {
        "@type": "WebSite",
        "@id": `https://${host}/#website`,
        name,
        url: `https://${host}`,
        publisher: { "@id": `https://${host}/#organization` },
        inLanguage: "en",
      },
    ],
  };
  return JSON.stringify(data);
}

/**
 * Product JSON-LD — emit on /products/[id]. Inventory fields are best-
 * effort; we don't expose `availability` yet, so we leave it out rather
 * than lie. Price is rendered as a schema.org Offer with INR (NPR-style
 * currency comes later).
 */
export function productJsonLd(product: PublicProduct, host: string): string {
  const url = `https://${host}/products/${product.id}`;
  const images =
    product.photoUrls && product.photoUrls.length > 0
      ? product.photoUrls
      : product.photoUrl
        ? [product.photoUrl]
        : [];
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    description: product.description ?? undefined,
    image: images,
    sku: product.imsCode,
    ...(product.category ? { category: product.category.name } : {}),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "INR",
      price: product.finalSp,
    },
  };
  return JSON.stringify(data);
}

export function breadcrumbJsonLd(
  items: { name: string; url?: string }[],
): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
  return JSON.stringify(data);
}
