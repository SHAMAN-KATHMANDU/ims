import type { ReactNode } from "react";
import { getTenantContext } from "@/lib/tenant";
import { getSite } from "@/lib/api";
import {
  brandingToCssVars,
  brandingDisplayName,
  brandingLogoUrl,
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
  const theme = (site?.branding as { theme?: string } | null)?.theme ?? "light";

  return (
    <html lang="en" data-theme={theme}>
      <body style={vars as React.CSSProperties}>{children}</body>
    </html>
  );
}
