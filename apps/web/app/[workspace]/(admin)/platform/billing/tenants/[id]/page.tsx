import { AuthGuard } from "@/components/auth/auth-guard";
import { TenantDetailPage } from "@/views/platform-billing/components/TenantDetailPage";

export default function TenantDetailRoute() {
  return (
    <AuthGuard roles={["platformAdmin"]}>
      <TenantDetailPage />
    </AuthGuard>
  );
}
