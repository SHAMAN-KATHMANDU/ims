import { redirect } from "next/navigation";

export const metadata = { title: "Site design" };

export default async function SiteDesignRoute({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  redirect(`/${workspace}/content/design`);
}
