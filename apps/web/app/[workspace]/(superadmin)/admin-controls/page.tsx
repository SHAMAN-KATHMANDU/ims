import { AuthGuard } from "@/components/auth/auth-guard";
import { UsersPage } from "@/features/users";

/**
 * Admin Controls Page
 *
 * Restricted to superAdmin only.
 * Uses AuthGuard with roles for redirect-based protection.
 */
export default function AdminControlsPage() {
  return (
    <AuthGuard roles={["superAdmin"]} unauthorizedPath="/401">
      <UsersPage />
    </AuthGuard>
  );
}
