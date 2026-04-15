import type { ReactNode } from "react";
import { getTenantContext } from "@/lib/tenant";
import { getSite, getCategories, getNavPages } from "@/lib/api";
import { SiteHeader, SiteFooter } from "@/components/templates/shared";
import { notFound } from "next/navigation";

/**
 * Shell for every blog page — reuses the same SiteHeader/SiteFooter as the
 * template layouts so a visitor arriving at /blog sees the same chrome they
 * saw on the homepage, regardless of which template the tenant has picked.
 */
export async function BlogPageShell({ children }: { children: ReactNode }) {
  const ctx = await getTenantContext();
  const [site, categories, navPages] = await Promise.all([
    getSite(ctx.host, ctx.tenantId),
    getCategories(ctx.host, ctx.tenantId),
    getNavPages(ctx.host, ctx.tenantId),
  ]);
  if (!site) notFound();

  return (
    <div data-page="blog">
      <SiteHeader
        site={site}
        host={ctx.host}
        categories={categories}
        navPages={navPages}
      />
      <main className="container" style={{ padding: "3rem 0" }}>
        {children}
      </main>
      <SiteFooter site={site} host={ctx.host} navPages={navPages} />
    </div>
  );
}
