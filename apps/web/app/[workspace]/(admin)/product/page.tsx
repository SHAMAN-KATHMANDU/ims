import { headers } from "next/headers";
import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";
import { ProductPageClient } from "@/views/products";
import { getProductsServer } from "@/services/productServiceServer";
import { buildProductListParamsFromSearch } from "@/lib/searchParams";

type Props = {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace } = await params;
  return { title: `Products | ${workspace}` };
}

/** Products (inventory) – admin/superAdmin only. Server-fetches initial data. */
export default async function Product({ params, searchParams }: Props) {
  const { workspace } = await params;
  const resolvedSearchParams = await searchParams;
  const listParams = buildProductListParamsFromSearch(resolvedSearchParams);

  const headersList = await headers();
  const cookie = headersList.get("cookie");

  const initialData = await getProductsServer(cookie, workspace, listParams);

  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <ProductPageClient initialData={initialData} initialParams={listParams} />
    </AuthGuard>
  );
}
