import type { ReactNode } from "react";
import { getTenantContext } from "@/lib/tenant";
import { getSite } from "@/lib/api";
import {
  brandingToCssVars,
  brandingDisplayName,
  brandingLogoUrl,
  brandingTheme,
} from "@/lib/theme";
import "./globals.css";

export async function generateMetadata() {
  try {
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
  const ctx = await getTenantContext();
  const site = await getSite(ctx.host, ctx.tenantId);
  const vars = brandingToCssVars(site?.branding ?? null);
  const theme = brandingTheme(site?.branding ?? null);

  // Inline the design tokens on <html> (not <body>) so the ":focus-visible"
  // outline + anything using the tokens in the document root — including
  // the scroll area before <body> fills out — still sees them.
  return (
    <html lang="en" data-theme={theme} style={vars as React.CSSProperties}>
      <body>{children}</body>
    </html>
  );
}
