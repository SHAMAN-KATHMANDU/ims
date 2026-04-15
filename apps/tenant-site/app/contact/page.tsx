import { getTenantContext } from "@/lib/tenant";
import { getSite, getCategories, getNavPages } from "@/lib/api";
import { pickTemplate } from "@/components/templates/pickTemplate";
import { readSections } from "@/lib/sections";
import { notFound } from "next/navigation";

export default async function ContactPage() {
  const ctx = await getTenantContext();
  const [site, categories, navPages] = await Promise.all([
    getSite(ctx.host, ctx.tenantId),
    getCategories(ctx.host, ctx.tenantId),
    getNavPages(ctx.host, ctx.tenantId),
  ]);

  if (!site) notFound();

  const TemplateLayout = pickTemplate(site.template?.slug ?? null);
  return (
    <TemplateLayout
      page="contact"
      site={site}
      products={[]}
      categories={categories}
      navPages={navPages}
      sections={readSections(site.features)}
    />
  );
}
