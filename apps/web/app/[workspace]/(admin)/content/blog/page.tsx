import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ workspace: string }>;
};

/** Legacy `/content/blog` → canonical Settings › Site › Blog. */
export default async function ContentBlogRedirect({ params }: Props) {
  const { workspace } = await params;
  const slug = workspace?.trim() || "admin";
  redirect(`/${slug}/settings/site/blog`);
}
