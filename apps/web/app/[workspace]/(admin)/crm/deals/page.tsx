import type { Metadata } from "next";
import { DealsKanbanPageClient } from "@/views/crm/deals/DealsKanbanPage";

type Props = {
  params: Promise<{ workspace: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace } = await params;
  return { title: `Deals | ${workspace}` };
}

export default async function CrmDeals() {
  return <DealsKanbanPageClient initialData={undefined} />;
}
