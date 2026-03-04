import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { CrmReportsPage } from "@/features/crm";

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
