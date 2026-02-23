import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";
import { TenantsPage } from "@/views/tenants";

type Props = {
  params: Promise<{ workspace: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace } = await params;
  return { title: `Tenants | ${workspace}` };
}

/** Platform tenants list – platformAdmin only. */
export default function PlatformTenantsRoute() {
  return (
    <AuthGuard roles={["platformAdmin"]} unauthorizedPath={WORKSPACE_ROOT}>
      <TenantsPage />
    </AuthGuard>
  );
}
