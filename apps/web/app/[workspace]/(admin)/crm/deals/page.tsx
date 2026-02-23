import { headers } from "next/headers";
import type { Metadata } from "next";
import { DealsKanbanPageClient } from "@/views/crm/deals/DealsKanbanPage";
import { getDealsKanbanServer } from "@/services/dealServiceServer";

type Props = {
  params: Promise<{ workspace: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace } = await params;
  return { title: `Deals | ${workspace}` };
}

/** CRM Deals (Kanban). Server-fetches initial kanban data. */
export default async function CrmDeals({ params }: Props) {
  const { workspace } = await params;

  const headersList = await headers();
  const cookie = headersList.get("cookie");

  const initialData = await getDealsKanbanServer(cookie, workspace);

  return <DealsKanbanPageClient initialData={initialData} />;
}
