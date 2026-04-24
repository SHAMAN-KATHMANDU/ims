import { PermissionGate } from "@/features/permissions";
import { TenantPagesPage } from "@/features/tenant-pages";

export const metadata = { title: "Pages" };

type Props = {
  params: Promise<{ workspace: string }>;
};

export default async function PagesListRoute({ params }: Props) {
  const { workspace } = await params;
  const base = `/${workspace}/settings/site/pages`;
  return (
    <PermissionGate perm="WEBSITE.PAGES.VIEW">
      <TenantPagesPage newHref={`${base}/new`} editHrefBase={base} />
    </PermissionGate>
  );
}
