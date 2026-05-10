import { PostEditorView } from "@/features/tenant-site/blog";

export const metadata = { title: "Post — CMS" };

interface PostPageProps {
  params: Promise<{ postId: string }>;
}

export default async function PostPage({ params }: PostPageProps) {
  const { postId } = await params;
  return <PostEditorView postId={postId} />;
}
