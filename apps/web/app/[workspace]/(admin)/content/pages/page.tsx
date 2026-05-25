import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ workspace: string }>;
};

/** Legacy `/content/pages` → canonical Settings › Site › Pages. */
export default async function ContentPagesRedirect({ params }: Props) {
  const { workspace } = await params;
  const slug = workspace?.trim() || "admin";
  redirect(`/${slug}/settings/site/pages`);
}
