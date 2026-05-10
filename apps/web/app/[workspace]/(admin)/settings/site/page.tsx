import { redirect } from "next/navigation";

export const metadata = { title: "Website" };

export default async function TenantSiteRoute({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  redirect(`/${workspace}/site/dashboard`);
}
