import { TenantPagesPage } from "@/features/tenant-pages";

export const metadata = { title: "Pages" };

type Props = {
  params: Promise<{ workspace: string }>;
};

export default async function PagesListRoute({ params }: Props) {
  const { workspace } = await params;
  const base = `/${workspace}/settings/site/pages`;
  return (
    <TenantPagesPage
      newHref={`${base}/new`}
      editHrefFor={(id) => `${base}/${id}`}
    />
  );
}
