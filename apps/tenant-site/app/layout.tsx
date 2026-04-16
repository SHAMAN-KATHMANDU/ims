// Cache-bust marker for Docker build time benchmark (mode=max vs min).
import type { ReactNode } from "react";
import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};
import { headers } from "next/headers";
import { getTenantContext } from "@/lib/tenant";
import { getSite } from "@/lib/api";
import {
  brandingToCssVars,
  brandingDisplayName,
  brandingLogoUrl,
  brandingTheme,
} from "@/lib/theme";
import { ThemeTokensSchema, type ThemeTokens } from "@repo/shared";
import { themeTokensToCssVars } from "@/lib/theme-tokens";
import { CartProvider } from "@/components/cart/CartProvider";
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
    const site = await getSite(ctx.host, ctx.tenantId);
    const seo = (site?.seo ?? {}) as { title?: string; description?: string };
    const name = brandingDisplayName(site?.branding ?? null, ctx.host);
    return {
      title: seo.title || name,
      description: seo.description,
      icons: brandingLogoUrl(site?.branding ?? null)
        ? { icon: brandingLogoUrl(site?.branding ?? null)! }
        : undefined,
    };
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
  const site = await getSite(ctx.host, ctx.tenantId);

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
