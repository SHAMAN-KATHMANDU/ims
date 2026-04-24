"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { PermissionGate } from "@/features/permissions";
import { BlogPostEditor, useBlogPost } from "@/features/tenant-blog";

type Props = {
  params: Promise<{ workspace: string; id: string }>;
};

export default function EditBlogPostRoute({ params }: Props) {
  const { workspace, id } = use(params);
  const { data: post, isLoading, isError } = useBlogPost(id);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (isError || !post) {
    notFound();
  }

  return (
    <PermissionGate perm="WEBSITE.BLOG.UPDATE">
      <BlogPostEditor
        post={post}
        backHref={`/${workspace}/settings/site/blog`}
      />
    </PermissionGate>
  );
}
