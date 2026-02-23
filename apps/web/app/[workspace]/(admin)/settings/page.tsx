import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";
import { SettingsPage } from "@/views/settings";

type Props = {
  params: Promise<{ workspace: string }>;
};

/** Revalidate every 60 seconds – settings change infrequently. */
export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace } = await params;
  return { title: `Settings | ${workspace}` };
}

/** Workspace settings – admin/superAdmin only. */
export default function Settings() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <SettingsPage />
    </AuthGuard>
  );
}
