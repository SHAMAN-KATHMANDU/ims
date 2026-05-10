import { redirect } from "next/navigation";

interface ContentRouteProps {
  params: Promise<{ workspace: string }>;
}

export default async function ContentRoute({ params }: ContentRouteProps) {
  const { workspace } = await params;
  redirect(`/${workspace}/content/dashboard`);
}
