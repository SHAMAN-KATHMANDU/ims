/**
 * Slug-level 404 page — rendered when notFound() is called inside
 * [...slug]/page.tsx. Uses SiteLayout scope "404" for custom blocks.
 */

import { getSite, getCategories, getNavPages, getSiteLayout } from "@/lib/api";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import type { BlockDataContext } from "@/components/blocks/data-context";
import type { BlockNode } from "@repo/shared";

export default async function SlugNotFound() {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const tenantId = h.get("x-tenant-id");
    const host = h.get("x-host") ?? h.get("host") ?? "";

    if (!tenantId || !host) {
      return <DefaultNotFound />;
    }

    const [site, headerLayout, layout, footerLayout, categories, navPages] =
      await Promise.all([
        getSite(host, tenantId).catch(() => null),
        getSiteLayout(host, tenantId, "header").catch(() => null),
        getSiteLayout(host, tenantId, "404").catch(() => null),
        getSiteLayout(host, tenantId, "footer").catch(() => null),
        getCategories(host, tenantId).catch(() => []),
        getNavPages(host, tenantId).catch(() => []),
      ]);

    if (!site) {
      return <DefaultNotFound />;
    }

    const blocks = [
      ...(Array.isArray(headerLayout?.blocks)
        ? (headerLayout.blocks as BlockNode[])
        : []),
      ...(Array.isArray(layout?.blocks) ? (layout.blocks as BlockNode[]) : []),
      ...(Array.isArray(footerLayout?.blocks)
        ? (footerLayout.blocks as BlockNode[])
        : []),
    ];

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
        <main>
          {blocks.length > 0 ? (
            <BlockRenderer nodes={blocks} dataContext={dataContext} />
          ) : (
            <div
              style={{
                maxWidth: "var(--container-width, 1200px)",
                margin: "0 auto",
                padding: "0 1rem",
              }}
            >
              <DefaultNotFound />
            </div>
          )}
        </main>
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
