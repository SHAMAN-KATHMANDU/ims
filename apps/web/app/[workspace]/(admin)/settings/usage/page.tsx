import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth/auth-guard";
import { UsageDashboard } from "@/views/settings/UsageDashboard";

type Props = {
  params: Promise<{ workspace: string }>;
};

/** Revalidate every 60 seconds – usage data can be slightly stale. */
export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace } = await params;
  return { title: `Usage | ${workspace}` };
}

export default function UsagePage() {
  return (
    <AuthGuard roles={["admin", "superAdmin"]}>
      <UsageDashboard />
    </AuthGuard>
  );
}
