import type { Metadata } from "next";
import { LeadsPageClient } from "@/views/crm/leads/LeadsPage";
import { buildLeadListParamsFromSearch } from "@/lib/searchParams";

type Props = {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace } = await params;
  return { title: `Leads | ${workspace}` };
}

export default async function CrmLeads({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const listParams = buildLeadListParamsFromSearch(resolvedSearchParams);

  return <LeadsPageClient initialData={undefined} initialParams={listParams} />;
}
