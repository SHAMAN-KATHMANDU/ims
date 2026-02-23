import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";
import { TrendsPage } from "@/views/analytics/TrendsPage";

type Props = {
  params: Promise<{ workspace: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace } = await params;
  return { title: `Trends | ${workspace}` };
}

/**
 * Trends & Patterns Analytics: MoM growth, seasonality, cohort retention, peak hours.
 */
export default function ReportsAnalyticsTrendsPage() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <TrendsPage />
    </AuthGuard>
  );
}
