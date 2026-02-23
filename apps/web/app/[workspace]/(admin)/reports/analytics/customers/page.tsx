import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";
import { CustomersPromosPage } from "@/views/analytics/CustomersPromosPage";

type Props = {
  params: Promise<{ workspace: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace } = await params;
  return { title: `Customers Analytics | ${workspace}` };
}

/**
 * Customers, Products & Promotions Analytics – admin/superAdmin only.
 */
export default function ReportsAnalyticsCustomers() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <CustomersPromosPage />
    </AuthGuard>
  );
}
