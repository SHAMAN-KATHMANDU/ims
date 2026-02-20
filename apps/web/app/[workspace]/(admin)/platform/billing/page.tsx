import { AuthGuard } from "@/components/auth/auth-guard";
import { PlatformBillingPage } from "@/views/platform-billing";

export default function BillingPage() {
  return (
    <AuthGuard roles={["platformAdmin"]}>
      <PlatformBillingPage />
    </AuthGuard>
  );
}
