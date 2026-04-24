"use client";

import dynamic from "next/dynamic";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { EnvFeaturePageGuard, FeaturePageGuard } from "@/features/flags";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";
import { PermissionGate } from "@/features/permissions";
import { LoadingPage } from "@/components/layout/loading-page";

const FinancialPage = dynamic(
  () =>
    import("@/features/analytics").then((m) => ({
      default: m.FinancialPage,
    })),
  { loading: () => <LoadingPage />, ssr: false },
);

/**
 * Financial Analytics: gross profit, COGS breakdown, margin by category.
 */
export default function ReportsAnalyticsFinancialPage() {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.REPORTS_FINANCIAL}>
      <FeaturePageGuard feature={Feature.ANALYTICS_ADVANCED}>
        <AuthGuard
          roles={["admin", "superAdmin"]}
          unauthorizedPath={WORKSPACE_ROOT}
        >
          <PermissionGate perm="REPORTS.ANALYTICS.VIEW">
            <FinancialPage />
          </PermissionGate>
        </AuthGuard>
      </FeaturePageGuard>
    </EnvFeaturePageGuard>
  );
}
