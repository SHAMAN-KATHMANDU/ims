"use client";

import dynamic from "next/dynamic";
import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { EnvFeaturePageGuard, FeaturePageGuard } from "@/features/flags";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";
import { PermissionGate } from "@/features/permissions";
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
        <AuthGuardWithWorkspace roles={["admin", "superAdmin"]}>
          <PermissionGate perm="REPORTS.ANALYTICS.VIEW">
            <TrendsPage />
          </PermissionGate>
        </AuthGuardWithWorkspace>
      </FeaturePageGuard>
    </EnvFeaturePageGuard>
  );
}
