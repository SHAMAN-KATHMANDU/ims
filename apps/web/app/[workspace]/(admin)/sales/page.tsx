import { headers } from "next/headers";
import type { Metadata } from "next";
import { SalesPageClient } from "@/views/sales";
import { getSalesServer } from "@/services/salesServiceServer";
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

/** Route shell; server-fetches initial data and passes to client view. */
export default async function Sales({ params, searchParams }: Props) {
  const { workspace } = await params;
  const resolvedSearchParams = await searchParams;
  const rawParams = buildSalesListParamsFromSearch(resolvedSearchParams);
  const listParams: SalesListParams = {
    ...rawParams,
    type: rawParams.type as SalesListParams["type"],
  };

  const headersList = await headers();
  const cookie = headersList.get("cookie");

  const initialData = await getSalesServer(cookie, workspace, listParams);

  return (
    <SalesPageClient initialData={initialData} initialParams={listParams} />
  );
}
