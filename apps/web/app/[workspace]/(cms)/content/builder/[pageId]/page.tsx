import { SITE_LAYOUT_SCOPES, type SiteLayoutScope } from "@repo/shared";
import { SiteEditorPage } from "@/features/tenant-site/site-editor";

export const metadata = { title: "Page Builder — CMS" };

interface BuilderPageProps {
  params: Promise<{ workspace: string; pageId: string }>;
  searchParams: Promise<{ scope?: string }>;
}

function narrowScope(scope: string | undefined): SiteLayoutScope {
  if (scope && (SITE_LAYOUT_SCOPES as readonly string[]).includes(scope)) {
    return scope as SiteLayoutScope;
  }
  return "home";
}

export default async function BuilderPage({
  params,
  searchParams,
}: BuilderPageProps) {
  const { workspace, pageId } = await params;
  const { scope } = await searchParams;
  return (
    <SiteEditorPage
      workspace={workspace}
      pageId={pageId}
      scope={narrowScope(scope)}
    />
  );
}
