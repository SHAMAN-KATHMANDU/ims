"use client";

import dynamic from "next/dynamic";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { EnvFeaturePageGuard, FeaturePageGuard } from "@/features/flags";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";
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
        <AuthGuard
          roles={["admin", "superAdmin"]}
          unauthorizedPath={WORKSPACE_ROOT}
        >
          <SalesRevenuePage />
        </AuthGuard>
      </FeaturePageGuard>
    </EnvFeaturePageGuard>
  );
}
