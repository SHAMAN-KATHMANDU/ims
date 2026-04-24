import { PermissionGate } from "@/features/permissions";
import { TenantPageEditor } from "@/features/tenant-pages";

export const metadata = { title: "New page" };

type Props = {
  params: Promise<{ workspace: string }>;
};

export default async function NewTenantPageRoute({ params }: Props) {
  const { workspace } = await params;
  return (
    <PermissionGate perm="WEBSITE.PAGES.CREATE">
      <TenantPageEditor backHref={`/${workspace}/settings/site/pages`} />
    </PermissionGate>
  );
}
