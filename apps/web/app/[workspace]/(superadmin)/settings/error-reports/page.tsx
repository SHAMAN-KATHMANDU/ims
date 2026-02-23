import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";
import { ErrorReportsPage } from "@/views/settings/ErrorReportsPage";

type Props = {
  params: Promise<{ workspace: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace } = await params;
  return { title: `Error Reports | ${workspace}` };
}

/** Error reports – superAdmin only. */
export default function ErrorReportsRoute() {
  return (
    <AuthGuard roles={["superAdmin"]} unauthorizedPath={WORKSPACE_ROOT}>
      <ErrorReportsPage />
    </AuthGuard>
  );
}
