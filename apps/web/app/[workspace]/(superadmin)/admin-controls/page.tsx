import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth/auth-guard";
import { UsersPage } from "@/views/users";

type Props = {
  params: Promise<{ workspace: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace } = await params;
  return { title: `Admin Controls | ${workspace}` };
}

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
