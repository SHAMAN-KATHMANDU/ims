import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";
import { CrmReportsPage } from "@/views/crm/reports/CrmReportsPage";

type Props = {
  params: Promise<{ workspace: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace } = await params;
  return { title: `CRM Reports | ${workspace}` };
}

/**
 * CRM Reports: deals won/lost, revenue, conversion rate, sales per user, leads by source.
 * Admin and superAdmin only.
 */
export default function ReportsCrmPage() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <CrmReportsPage />
    </AuthGuard>
  );
}
