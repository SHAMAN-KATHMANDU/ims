"use client";

import dynamic from "next/dynamic";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { EnvFeaturePageGuard, FeaturePageGuard } from "@/features/flags";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";
import { LoadingPage } from "@/components/layout/loading-page";

const TrendsPage = dynamic(
  () =>
    import("@/features/analytics").then((m) => ({
      default: m.TrendsPage,
    })),
  { loading: () => <LoadingPage />, ssr: false },
);

/**
 * Trends & Patterns Analytics: MoM growth, seasonality, cohort retention, peak hours.
 */
export default function ReportsAnalyticsTrendsPage() {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.REPORTS_TRENDS}>
      <FeaturePageGuard feature={Feature.ANALYTICS_ADVANCED}>
        <AuthGuard
          roles={["admin", "superAdmin"]}
          unauthorizedPath={WORKSPACE_ROOT}
        >
          <TrendsPage />
        </AuthGuard>
      </FeaturePageGuard>
    </EnvFeaturePageGuard>
  );
}
