import type { Metadata } from "next";
import { CrmDashboardPage } from "@/views/crm/CrmDashboardPage";

type Props = {
  params: Promise<{ workspace: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace } = await params;
  return { title: `CRM | ${workspace}` };
}

export default function CrmDashboard() {
  return <CrmDashboardPage />;
}
