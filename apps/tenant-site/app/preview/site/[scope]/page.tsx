/**
 * Token-gated draft preview for block-based SiteLayouts.
 *
 * The Framer-lite editor (apps/web) mints a signed URL pointing here with
 * a site-scope token in the `?token=` query. This route asks the API for
 * the draft layout + tenant context via a single endpoint that verifies
 * the token server-side, then renders the tree with BlockRenderer +
 * SiteHeader/SiteFooter so the editor sees a full-page preview.
 *
 * The middleware bypass for `/preview/` paths means this route works even
 * when the iframe is pointed at a tenant-site URL whose Host header
 * doesn't map to a published tenant (the token IS the auth).
 */

import type { Metadata } from "next";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import { EditorPreviewShell } from "@/components/blocks/EditorPreviewShell";
import { EditorBridge } from "@/components/editor-bridge";
import { SiteHeader, SiteFooter } from "@/components/templates/shared";
import type { BlockDataContext } from "@/components/blocks/data-context";
import type { BlockNode } from "@repo/shared";
import type {
  PublicCategory,
  PublicNavPage,
  PublicProduct,
  PublicSite,
  PublicBlogPostListItem,
} from "@/lib/api";

const API = process.env.API_INTERNAL_URL ?? "http://localhost:4000/api/v1";

export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false },
};

// Drafts must never be cached.
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ scope: string }>;
  searchParams: Promise<{
    token?: string | string[];
    productId?: string | string[];
    pageId?: string | string[];
    grid?: string | string[];
    /** Injected by PreviewFrame — activates EditorBridge + EditorPreviewShell. */
    _editor?: string | string[];
  }>;
};

// Mirrors apps/api public-site-preview.service.ts response shape.
interface SitePreviewApiResponse {
  scope: string;
  pageId: string | null;
  draftLayout: {
    blocks: unknown;
    version: number;
    updatedAt: string;
  } | null;
  site: {
    branding: unknown;
    contact: unknown;
    features: unknown;
    seo: unknown;
    template: unknown;
  };
  categories: PublicCategory[];
  products: PublicProduct[];
  navPages: PublicNavPage[];
  featuredBlogPosts: PublicBlogPostListItem[];
  activeProduct: PublicProduct | null;
  relatedProducts: PublicProduct[];
}

function readString(raw: string | string[] | undefined): string | null {
  if (!raw) return null;
  const v = Array.isArray(raw) ? raw[0] : raw;
  return typeof v === "string" && v.length > 0 ? v : null;
}

async function fetchPreview(
  scope: string,
  token: string,
  productId: string | null,
): Promise<SitePreviewApiResponse | { error: string }> {
  try {
    const qs = new URLSearchParams({ token });
    if (productId) qs.set("productId", productId);
    const res = await fetch(
      `${API}/public/preview/site/${encodeURIComponent(scope)}?${qs.toString()}`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      let message = `Preview unavailable (HTTP ${res.status})`;
      try {
        const body = (await res.json()) as { message?: string };
        if (body?.message) message = body.message;
      } catch {
        // ignore
      }
      return { error: message };
    }
    return (await res.json()) as SitePreviewApiResponse;
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

function PreviewBanner({ scope }: { scope: string }) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "#1e1e1e",
        color: "#fff",
        padding: "8px 16px",
        fontSize: 13,
        fontFamily:
          "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        textAlign: "center",
        letterSpacing: "0.02em",
      }}
    >
      <strong>PREVIEW</strong> — Draft · scope: <code>{scope}</code> · reload to
      see latest edits
    </div>
  );
}

function ErrorShell({ message }: { message: string }) {
  return (
    <main
      style={{
        maxWidth: 540,
        margin: "10vh auto",
        padding: "24px",
        fontFamily:
          "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        color: "var(--color-text, #1e1e1e)",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Preview unavailable</h1>
      <p style={{ color: "var(--color-muted, #666)", fontSize: 14 }}>
        {message}
      </p>
    </main>
  );
}

export default async function SitePreviewRoute({
  params,
  searchParams,
}: Props) {
  const { scope } = await params;
  const sp = await searchParams;
  const token = readString(sp.token);
  const productId = readString(sp.productId);
  const showGrid =
    sp.grid === "1" || (Array.isArray(sp.grid) && sp.grid[0] === "1");
  const isEditorMode =
    sp._editor === "1" || (Array.isArray(sp._editor) && sp._editor[0] === "1");

  if (!token) {
    return <ErrorShell message="Missing preview token in URL." />;
  }

  const result = await fetchPreview(scope, token, productId);
  if ("error" in result) {
    return <ErrorShell message={result.error} />;
  }

  // Build a PublicSite from the preview payload (the service returns a
  // subset — the renderer's PublicSite shape matches).
  const site: PublicSite = {
    branding: result.site.branding as Record<string, unknown> | null,
    contact: result.site.contact as Record<string, unknown> | null,
    features: result.site.features as Record<string, unknown> | null,
    seo: result.site.seo as Record<string, unknown> | null,
    template: null,
  };

  const blocks =
    result.draftLayout && Array.isArray(result.draftLayout.blocks)
      ? (result.draftLayout.blocks as BlockNode[])
      : [];

  // Preview host is arbitrary (the iframe lives on the tenant-site URL) and
  // is used as the *display fallback* for BrandMark when no
  // BusinessProfile.displayName / SiteConfig.branding.name is set. Use a
  // human-readable string so an empty brand reads "Your site" instead of
  // leaking a "__preview__" sentinel into the rendered header. Tenant id is
  // never rendered as text — kept as a sentinel for cache-tag scoping.
  const dataContext: BlockDataContext = {
    site,
    host: "Your site",
    tenantId: "__preview__",
    categories: result.categories,
    navPages: result.navPages,
    products: result.products,
    featuredBlogPosts: result.featuredBlogPosts,
    activeProduct: result.activeProduct ?? undefined,
    relatedProducts: result.relatedProducts ?? [],
  };

  return (
    <>
      {showGrid && <GridOverlay />}
      <PreviewBanner scope={scope} />
      {/*
       * EditorBridge: only when loaded from the site editor.
       * Attaches click/hover listeners and posts block-selection events to
       * the parent window — enables cross-origin click-to-select.
       */}
      {isEditorMode && <EditorBridge />}
      <SiteHeader
        site={site}
        host={dataContext.host}
        categories={result.categories}
        navPages={result.navPages}
      />
      <main>
        {blocks.length > 0 ? (
          isEditorMode ? (
            /*
             * EditorPreviewShell: client-side wrapper that reloads the iframe
             * on `editor:block-tree` postMessages from PreviewFrame. We render
             * the server-only BlockRenderer as children (passed in from this
             * server parent) so the block registry never enters the client
             * bundle — keeping next-build happy with `next/headers` usage.
             */
            <EditorPreviewShell>
              <BlockRenderer nodes={blocks} dataContext={dataContext} />
            </EditorPreviewShell>
          ) : (
            <BlockRenderer nodes={blocks} dataContext={dataContext} />
          )
        ) : (
          <EmptyState scope={scope} />
        )}
      </main>
      <SiteFooter
        site={site}
        host={dataContext.host}
        navPages={result.navPages}
      />
    </>
  );
}

function EmptyState({ scope }: { scope: string }) {
  return (
    <div
      style={{
        maxWidth: 540,
        margin: "6rem auto",
        padding: "2rem",
        textAlign: "center",
        color: "var(--color-muted, #666)",
      }}
    >
      <h2
        style={{
          fontSize: "1.5rem",
          marginBottom: "0.75rem",
          color: "var(--color-text, #111)",
        }}
      >
        No blocks yet
      </h2>
      <p style={{ fontSize: "0.95rem", lineHeight: 1.6 }}>
        This scope (<code>{scope}</code>) has no block tree. Add your first
        block in the editor to see it here.
      </p>
    </div>
  );
}

function GridOverlay() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1200,
          padding: "0 1.5rem",
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "0",
        }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            style={{
              background: "rgba(59, 130, 246, 0.06)",
              borderLeft: "1px solid rgba(59, 130, 246, 0.12)",
              borderRight:
                i === 11 ? "1px solid rgba(59, 130, 246, 0.12)" : "none",
              minHeight: "100vh",
            }}
          />
        ))}
      </div>
    </div>
  );
}
