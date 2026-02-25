import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";
import { ProductPageClient } from "@/views/products";
import { buildProductListParamsFromSearch } from "@/lib/searchParams";

type Props = {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace } = await params;
  return { title: `Products | ${workspace}` };
}

export default async function Product({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const listParams = buildProductListParamsFromSearch(resolvedSearchParams);

  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <ProductPageClient initialData={undefined} initialParams={listParams} />
    </AuthGuard>
  );
}
