import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";

/**
 * Finance report placeholder – admin/superAdmin only.
 * TODO: Sales report by location/date/payment, export (see plan §6.2).
 */
export default function ReportsFinancePage() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Finance Report</h1>
          <p className="text-muted-foreground mt-2">
            Sales totals, by location and date (coming soon).
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}
