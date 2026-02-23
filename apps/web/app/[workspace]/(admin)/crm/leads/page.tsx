import { headers } from "next/headers";
import type { Metadata } from "next";
import { LeadsPageClient } from "@/views/crm/leads/LeadsPage";
import { getLeadsServer } from "@/services/leadServiceServer";
import { buildLeadListParamsFromSearch } from "@/lib/searchParams";

type Props = {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace } = await params;
  return { title: `Leads | ${workspace}` };
}

/** CRM Leads. Server-fetches initial data. */
export default async function CrmLeads({ params, searchParams }: Props) {
  const { workspace } = await params;
  const resolvedSearchParams = await searchParams;
  const listParams = buildLeadListParamsFromSearch(resolvedSearchParams);

  const headersList = await headers();
  const cookie = headersList.get("cookie");

  const initialData = await getLeadsServer(cookie, workspace, listParams);

  return (
    <LeadsPageClient initialData={initialData} initialParams={listParams} />
  );
}
