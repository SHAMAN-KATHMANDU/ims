import { AuthGuard } from "@/components/auth/auth-guard";
import { UsageDashboard } from "@/views/settings/UsageDashboard";

export default function UsagePage() {
  return (
    <AuthGuard roles={["admin", "superAdmin"]}>
      <UsageDashboard />
    </AuthGuard>
  );
}
