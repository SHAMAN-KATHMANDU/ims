import { redirect } from "next/navigation";

export default async function AttributeTypesRedirect({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  const slug = workspace?.trim() || "admin";
  redirect(`/${slug}/products/catalog-settings?tab=attribute-types`);
}
