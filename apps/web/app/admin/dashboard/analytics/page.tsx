import { AuthGuard } from "@/components/auth/auth-guard";
import { AnalyticsPage } from "@/views/dashboard/analytics";

/**
 * Analytics Page
 *
 * Restricted to admin and superAdmin roles.
 * Uses AuthGuard with roles for redirect-based protection.
 */
export default function Analytics() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath="/admin/dashboard"
    >
      <AnalyticsPage />
    </AuthGuard>
  );
}
