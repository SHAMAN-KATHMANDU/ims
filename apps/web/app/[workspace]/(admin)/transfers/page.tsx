import { headers } from "next/headers";
import { TransfersPageClient } from "@/views/transfers";
import { getTransfersServer } from "@/services/transferServiceServer";
import type { TransferListParams } from "@/services/transferService";
import { buildTransferListParamsFromSearch } from "@/lib/searchParams";

/** Transfers. Server-fetches initial data. */
export default async function Transfers({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace } = await params;
  const resolvedSearchParams = await searchParams;
  const listParams = buildTransferListParamsFromSearch(
    resolvedSearchParams,
  ) as TransferListParams;

  const headersList = await headers();
  const cookie = headersList.get("cookie");

  const initialData = await getTransfersServer(cookie, workspace, listParams);

  return (
    <TransfersPageClient initialData={initialData} initialParams={listParams} />
  );
}
