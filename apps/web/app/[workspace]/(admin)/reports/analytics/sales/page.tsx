"use client";

import dynamic from "next/dynamic";
import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { EnvFeaturePageGuard, FeaturePageGuard } from "@/features/flags";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";
import { PermissionGate } from "@/features/permissions";
import { LoadingPage } from "@/components/layout/loading-page";

const SalesRevenuePage = dynamic(
  () =>
    import("@/features/analytics").then((m) => ({
      default: m.SalesRevenuePage,
    })),
  { loading: () => <LoadingPage />, ssr: false },
);

/**
 * Sales & Revenue Analytics. User role sees own data only (backend enforces).
 */
export default function ReportsAnalyticsSalesPage() {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.REPORTS_SALES}>
      <FeaturePageGuard feature={Feature.ANALYTICS_ADVANCED}>
        <AuthGuardWithWorkspace roles={["admin", "superAdmin"]}>
          <PermissionGate perm="REPORTS.ANALYTICS.VIEW">
            <SalesRevenuePage />
          </PermissionGate>
        </AuthGuardWithWorkspace>
      </FeaturePageGuard>
    </EnvFeaturePageGuard>
  );
}
