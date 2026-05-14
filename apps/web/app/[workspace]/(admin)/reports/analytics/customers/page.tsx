"use client";

import dynamic from "next/dynamic";
import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { EnvFeaturePageGuard, FeaturePageGuard } from "@/features/flags";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";
import { PermissionGate } from "@/features/permissions";
import { LoadingPage } from "@/components/layout/loading-page";

const CustomersPromosPage = dynamic(
  () =>
    import("@/features/analytics").then((m) => ({
      default: m.CustomersPromosPage,
    })),
  { loading: () => <LoadingPage />, ssr: false },
);

/**
 * Customers, Products & Promotions Analytics – admin/superAdmin only.
 */
export default function ReportsAnalyticsCustomers() {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.REPORTS_CUSTOMERS}>
      <FeaturePageGuard feature={Feature.ANALYTICS_ADVANCED}>
        <AuthGuardWithWorkspace roles={["admin", "superAdmin"]}>
          <PermissionGate perm="REPORTS.ANALYTICS.VIEW">
            <CustomersPromosPage />
          </PermissionGate>
        </AuthGuardWithWorkspace>
      </FeaturePageGuard>
    </EnvFeaturePageGuard>
  );
}
