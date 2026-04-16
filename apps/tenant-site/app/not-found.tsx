/**
 * Custom 404 page — renders a block-based layout when a SiteLayout row
 * exists for scope "404", otherwise falls back to the static default.
 *
 * The tenant composes their 404 in the design editor (scope picker shows
 * "404 page") so it matches their brand. The renderer wraps it in the
 * same SiteHeader/SiteFooter chrome as other pages.
 */

import { getSite, getCategories, getNavPages, getSiteLayout } from "@/lib/api";
import { SiteHeader, SiteFooter } from "@/components/templates/shared";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import type { BlockDataContext } from "@/components/blocks/data-context";
import type { BlockNode } from "@repo/shared";

export default async function NotFound() {
  // not-found.tsx runs outside the normal route tree, so getTenantContext()
  // may not have tenant headers (e.g. if middleware 404'd before setting
  // them). We try to read the layout but fall back gracefully.
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const tenantId = h.get("x-tenant-id");
    const host = h.get("x-host") ?? h.get("host") ?? "";

    if (!tenantId || !host) {
      return <DefaultNotFound />;
    }

    const [site, layout, categories, navPages] = await Promise.all([
      getSite(host, tenantId),
      getSiteLayout(host, tenantId, "404").catch(() => null),
      getCategories(host, tenantId),
      getNavPages(host, tenantId),
    ]);

    if (
      !site ||
      !layout ||
      !Array.isArray(layout.blocks) ||
      layout.blocks.length === 0
    ) {
      // No custom 404 layout — show the branded default with header/footer
      if (site) {
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
      }
      return <DefaultNotFound />;
    }

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
