import type { Metadata } from "next";
import { SalesPageClient } from "@/views/sales";
import type { SalesListParams } from "@/services/salesService";
import { buildSalesListParamsFromSearch } from "@/lib/searchParams";

type Props = {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace } = await params;
  return { title: `Sales | ${workspace}` };
}

/**
 * Sales page — client-side data fetching only.
 * Server-side fetch is not used because the auth cookie (access_token) is scoped
 * to the API domain and cannot be forwarded from the web server in this architecture.
 */
export default async function Sales({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const rawParams = buildSalesListParamsFromSearch(resolvedSearchParams);
  const listParams: SalesListParams = {
    ...rawParams,
    type: rawParams.type as SalesListParams["type"],
  };

  return <SalesPageClient initialData={undefined} initialParams={listParams} />;
}
