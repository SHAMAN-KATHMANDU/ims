import { TransfersPageClient } from "@/views/transfers";
import type { TransferListParams } from "@/services/transferService";
import { buildTransferListParamsFromSearch } from "@/lib/searchParams";

export default async function Transfers({
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const listParams = buildTransferListParamsFromSearch(
    resolvedSearchParams,
  ) as TransferListParams;

  return (
    <TransfersPageClient initialData={undefined} initialParams={listParams} />
  );
}
