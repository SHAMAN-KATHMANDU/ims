"use client";

import dynamic from "next/dynamic";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { EnvFeaturePageGuard, FeaturePageGuard } from "@/features/flags";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";
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
        <AuthGuard
          roles={["admin", "superAdmin"]}
          unauthorizedPath={WORKSPACE_ROOT}
        >
          <CustomersPromosPage />
        </AuthGuard>
      </FeaturePageGuard>
    </EnvFeaturePageGuard>
  );
}
