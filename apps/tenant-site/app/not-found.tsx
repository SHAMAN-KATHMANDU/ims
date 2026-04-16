/**
 * Custom 404 page — renders a block-based layout when a SiteLayout row
 * exists for scope "404", otherwise falls back to a branded default.
 *
 * IMPORTANT: This page must NOT render SiteHeader/SiteFooter when there's
 * no tenant context (CartProvider isn't in the tree when the middleware
 * returned 404 for an unknown host). The guard at line ~28 returns early
 * with a plain DefaultNotFound when headers are missing.
 *
 * When tenant context IS available (the middleware resolved the host but
 * the page slug didn't match), we render the full branded 404 with
 * header/footer.
 */

import { getSite, getCategories, getNavPages, getSiteLayout } from "@/lib/api";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import type { BlockDataContext } from "@/components/blocks/data-context";
import type { BlockNode } from "@repo/shared";

export default async function NotFound() {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const tenantId = h.get("x-tenant-id");
    const host = h.get("x-host") ?? h.get("host") ?? "";

    if (!tenantId || !host) {
      return <DefaultNotFound />;
    }

    const [site, layout, categories, navPages] = await Promise.all([
      getSite(host, tenantId).catch(() => null),
      getSiteLayout(host, tenantId, "404").catch(() => null),
      getCategories(host, tenantId).catch(() => []),
      getNavPages(host, tenantId).catch(() => []),
    ]);

    if (!site) {
      return <DefaultNotFound />;
    }

    // If the tenant has a custom 404 block layout, render it.
    // We import SiteHeader/SiteFooter lazily to avoid the useCart crash
    // when this module is loaded outside CartProvider.
    const hasCustomLayout =
      layout && Array.isArray(layout.blocks) && layout.blocks.length > 0;

    const { SiteHeader, SiteFooter } =
      await import("@/components/templates/shared");

    if (hasCustomLayout) {
      const dataContext: BlockDataContext = {
        site,
        host,
        tenantId,
        categories,
        navPages,
        products: [],
        featuredBlogPosts: [],
      };

      return (
        <>
          <SiteHeader
            site={site}
            host={host}
            categories={categories}
            navPages={navPages}
          />
          <main>
            <BlockRenderer
              nodes={layout.blocks as BlockNode[]}
              dataContext={dataContext}
            />
          </main>
          <SiteFooter site={site} host={host} navPages={navPages} />
        </>
      );
    }

    // Branded default 404 with header/footer
    return (
      <>
        <SiteHeader
          site={site}
          host={host}
          categories={categories}
          navPages={navPages}
        />
        <DefaultNotFound />
        <SiteFooter site={site} host={host} navPages={navPages} />
      </>
    );
  } catch {
    return <DefaultNotFound />;
  }
}

function DefaultNotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontSize: "clamp(3rem, 8vw, 6rem)",
          fontFamily: "var(--font-display, system-ui)",
          fontWeight: 700,
          marginBottom: "1rem",
          color: "var(--color-text, #111)",
        }}
      >
        404
      </h1>
      <p
        style={{
          fontSize: "1.1rem",
          color: "var(--color-muted, #666)",
          maxWidth: 400,
          lineHeight: 1.6,
        }}
      >
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <a
        href="/"
        style={{
          marginTop: "2rem",
          padding: "0.75rem 1.5rem",
          background: "var(--color-primary, #111)",
          color: "var(--color-on-primary, #fff)",
          borderRadius: "var(--radius, 6px)",
          textDecoration: "none",
          fontWeight: 500,
        }}
      >
        Back to home
      </a>
    </div>
  );
}
