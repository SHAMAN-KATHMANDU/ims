import { PermissionGate } from "@/features/permissions";
import { BlogPostEditor } from "@/features/tenant-blog";

export const metadata = { title: "New post" };

type Props = {
  params: Promise<{ workspace: string }>;
};

export default async function NewBlogPostRoute({ params }: Props) {
  const { workspace } = await params;
  return (
    <PermissionGate perm="WEBSITE.BLOG.CREATE">
      <BlogPostEditor backHref={`/${workspace}/settings/site/blog`} />
    </PermissionGate>
  );
}
