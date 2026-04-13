import { getTenantContext } from "@/lib/tenant";
import { getSite, getCategories } from "@/lib/api";
import { pickTemplate } from "@/components/templates/pickTemplate";
import { notFound } from "next/navigation";

export default async function ContactPage() {
  const ctx = await getTenantContext();
  const [site, categories] = await Promise.all([
    getSite(ctx.host, ctx.tenantId),
    getCategories(ctx.host, ctx.tenantId),
  ]);

  if (!site) notFound();

  const TemplateLayout = pickTemplate(site.template?.slug ?? null);
  return (
    <TemplateLayout
      page="contact"
      site={site}
      products={[]}
      categories={categories}
    />
  );
}
