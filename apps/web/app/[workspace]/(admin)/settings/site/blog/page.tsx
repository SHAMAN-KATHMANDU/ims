import { TenantBlogPage } from "@/features/tenant-blog";

export const metadata = { title: "Blog" };

type Props = {
  params: Promise<{ workspace: string }>;
};

export default async function BlogListRoute({ params }: Props) {
  const { workspace } = await params;
  const base = `/${workspace}/settings/site/blog`;
  return <TenantBlogPage newHref={`${base}/new`} editHrefBase={base} />;
}
