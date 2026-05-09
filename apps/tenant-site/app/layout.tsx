import type { ReactNode } from "react";
import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};
import { cookies, headers } from "next/headers";
import { getTenantContext } from "@/lib/tenant";
import { getSiteWithProfile } from "@/lib/api";
import {
  brandingToCssVars,
  brandingDisplayName,
  brandingLogoUrl,
  brandingTheme,
} from "@/lib/theme";
import { ThemeTokensSchema, type ThemeTokens } from "@repo/shared";
import { themeTokensToCssVars } from "@/lib/theme-tokens";
import { CartProvider } from "@/components/cart/CartProvider";
import { renderAnalyticsScripts } from "@/lib/analytics";
import type { PublicSiteAnalytics } from "@/lib/api";
import "./globals.css";

/**
 * Some routes (e.g. /preview/*) bypass tenant middleware and don't carry
 * tenant context — they apply their own branding inside the page. For those
 * the root layout renders a minimal pass-through shell so layout doesn't
 * throw on missing headers.
 */
async function hasTenantContext(): Promise<boolean> {
  const h = await headers();
  return !!h.get("x-tenant-id");
}

export async function generateMetadata() {
  try {
    if (!(await hasTenantContext())) return { title: "Preview" };
    const ctx = await getTenantContext();
    const site = await getSiteWithProfile(
      ctx.host,
      ctx.tenantId,
      ctx.tenantSlug,
    );
    const seo = (site?.seo ?? {}) as Record<string, unknown>;
    const social = (seo.social ?? {}) as Record<string, unknown>;

    // Prefer TenantBusinessProfile identity fields; fall back to legacy branding JSON.
    const bp = site?.businessProfile;
    const name =
      bp?.displayName?.trim() ||
      brandingDisplayName(site?.branding ?? null, ctx.host);
    const faviconUrl =
      bp?.faviconUrl?.trim() || brandingLogoUrl(site?.branding ?? null) || null;

    const metadata: Record<string, unknown> = {
      title: (seo.title as string) || name,
      description: seo.description,
      icons: faviconUrl ? { icon: faviconUrl } : undefined,
      openGraph: {} as Record<string, unknown>,
      twitter: {} as Record<string, unknown>,
    };

    // Build OpenGraph meta tags
    const ogMetadata = metadata.openGraph as Record<string, unknown>;
    if ((seo.title as string)?.trim()) {
      ogMetadata.title = seo.title;
    }
    if ((seo.description as string)?.trim()) {
      ogMetadata.description = seo.description;
    }

    // Handle Facebook/OG image from cover image
    const facebook = social.facebook as Record<string, unknown> | undefined;
    if (facebook?.enabled && (seo.ogImage as string)?.trim()) {
      ogMetadata.images = [{ url: seo.ogImage as string }];
    }

    // Handle LinkedIn
    const linkedin = social.linkedin as Record<string, unknown> | undefined;
    if (!linkedin?.enabled) {
      // LinkedIn uses OpenGraph tags, so don't emit them if disabled
    }

    // Handle Twitter
    const twitter = social.twitter as Record<string, unknown> | undefined;
    const twitterMetadata = metadata.twitter as Record<string, unknown>;
    if (twitter?.enabled) {
      twitterMetadata.card = twitter.cardType || "summary_large_image";
      if ((twitter.handle as string)?.trim()) {
        twitterMetadata.creator = (twitter.handle as string).startsWith("@")
          ? (twitter.handle as string)
          : `@${twitter.handle}`;
      }
    }

    return metadata;
  } catch {
    return { title: "Site" };
  }
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!(await hasTenantContext())) {
    // Pass-through shell for token-gated routes (e.g. /preview/*). The page
    // handler is responsible for applying branding tokens itself.
    return (
      <html lang="en">
        <body>
          <a
            href="#main-content"
            className="skip-link"
            style={{
              position: "absolute",
              left: "-9999px",
              top: "auto",
              width: "1px",
              height: "1px",
              overflow: "hidden",
            }}
          >
            Skip to main content
          </a>
          {children}
        </body>
      </html>
    );
  }

  const ctx = await getTenantContext();
  const site = await getSiteWithProfile(ctx.host, ctx.tenantId, ctx.tenantSlug);

  // Prefer structured themeTokens (Phase 7+) over legacy branding JSON.
  // ThemeTokens are validated at parse time; if invalid we fall back to
  // branding so a corrupted themeTokens payload doesn't blank the site.
  let vars: Record<string, string>;
  let theme: string;
  const parsedTokens = ThemeTokensSchema.safeParse(site?.themeTokens);
  if (parsedTokens.success) {
    vars = themeTokensToCssVars(parsedTokens.data);
    theme = parsedTokens.data.mode === "dark" ? "dark" : "light";
  } else {
    vars = brandingToCssVars(site?.branding ?? null);
    theme = brandingTheme(site?.branding ?? null);
  }

  // A visitor's explicit toggle (site-theme cookie) overrides the tenant
  // default so reloads don't flash back to the configured mode.
  const cookieStore = await cookies();
  const cookieTheme = cookieStore.get("site-theme")?.value;
  if (cookieTheme === "light" || cookieTheme === "dark") {
    theme = cookieTheme;
  }

  // Analytics — only on published, indexable pages.
  // Preview routes don't carry x-tenant-id so they return the minimal shell
  // above and never reach this code (isPreview is implicitly false here).
  // noIndex is inferred from the SEO robots setting stored in site config.
  const seoRobots =
    (site?.seo as { robots?: string } | null)?.robots?.toLowerCase() ?? "";
  const noIndex = seoRobots.includes("noindex");
  const { headScripts } = renderAnalyticsScripts(
    site?.analytics as PublicSiteAnalytics | null | undefined,
    { isPreview: false, noIndex },
  );

  // Inline the design tokens on <html> (not <body>) so the ":focus-visible"
  // outline + anything using the tokens in the document root — including
  // the scroll area before <body> fills out — still sees them.
  //
  // CartProvider is a client boundary — only the cart state + the
  // hooks that need it (AddToCartButton, CartBadge, CartPage,
  // CheckoutForm) re-render when the cart mutates. The rest of the
  // tree stays server-rendered.
  return (
    <html lang="en" data-theme={theme} style={vars as React.CSSProperties}>
      <head>
        {headScripts}
        {/* Social meta tags */}
        {(() => {
          const seo = (site?.seo ?? {}) as Record<string, unknown>;
          const social = (seo.social ?? {}) as Record<string, unknown>;
          const ogImage = (seo.ogImage as string) ?? "";

          const whatsapp = social.whatsapp as
            | Record<string, unknown>
            | undefined;
          const pinterest = social.pinterest as
            | Record<string, unknown>
            | undefined;

          return (
            <>
              {whatsapp?.enabled && ogImage && (
                <meta property="og:image" content={ogImage} />
              )}
              {pinterest?.enabled && ogImage && (
                <>
                  <meta property="pinterest:media" content={ogImage} />
                  {(pinterest.handle as string)?.trim() && (
                    <meta
                      name="pinterest"
                      content={
                        (pinterest.handle as string).startsWith("@")
                          ? (pinterest.handle as string)
                          : `@${pinterest.handle}`
                      }
                    />
                  )}
                </>
              )}
            </>
          );
        })()}
        {/* Warm up the TCP/TLS handshake for the image CDN — most pages ship
            at least one S3-hosted product image so the handshake is on the
            critical path. `dns-prefetch` is the universal fallback for
            browsers that ignore `preconnect`. */}
        <link
          rel="preconnect"
          href="https://ims-shaman-photos.s3.ap-south-1.amazonaws.com"
          crossOrigin="anonymous"
        />
        <link
          rel="dns-prefetch"
          href="https://ims-shaman-photos.s3.ap-south-1.amazonaws.com"
        />
        {/* Google Fonts are requested via tenant branding's font CSS vars —
            preconnect so the CSS@import resolves without a cold handshake. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <a
          href="#main-content"
          className="skip-link"
          style={{
            position: "absolute",
            left: "-9999px",
            top: "auto",
            width: "1px",
            height: "1px",
            overflow: "hidden",
          }}
        >
          Skip to main content
        </a>
        <CartProvider tenantId={ctx.tenantId} host={ctx.host}>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
