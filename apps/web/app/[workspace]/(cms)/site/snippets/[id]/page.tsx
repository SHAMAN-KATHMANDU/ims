import { AuthGuard } from "@/components/auth/auth-guard";
import { EnvFeature, EnvFeaturePageGuard } from "@/features/flags";
import { PermissionGate } from "@/features/permissions";
import { SnippetEditorPage } from "@/features/tenant-site/snippets-cms";

export const metadata = { title: "Edit Snippet" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SnippetEditorRoute({ params }: Props) {
  const { id } = await params;
  return (
    <AuthGuard roles={["admin", "superAdmin"]}>
      <EnvFeaturePageGuard envFeature={EnvFeature.TENANT_WEBSITES}>
        <PermissionGate perm="WEBSITE.PAGES.UPDATE">
          <SnippetEditorPage snippetId={id} />
        </PermissionGate>
      </EnvFeaturePageGuard>
    </AuthGuard>
  );
}
