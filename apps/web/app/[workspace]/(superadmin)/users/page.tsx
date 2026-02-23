import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";
import { UsersPage } from "@/views/users";

type Props = {
  params: Promise<{ workspace: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace } = await params;
  return { title: `Users | ${workspace}` };
}

/** Users management – superAdmin only. */
export default function UsersManagementPage() {
  return (
    <AuthGuard roles={["superAdmin"]} unauthorizedPath={WORKSPACE_ROOT}>
      <UsersPage />
    </AuthGuard>
  );
}
