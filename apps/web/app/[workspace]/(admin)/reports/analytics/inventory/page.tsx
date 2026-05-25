"use client";

import dynamic from "next/dynamic";
import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { EnvFeaturePageGuard, FeaturePageGuard } from "@/features/flags";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";
import { PermissionGate } from "@/features/permissions";
import { LoadingPage } from "@/components/layout/loading-page";

const InventoryOpsPage = dynamic(
  () =>
    import("@/features/analytics").then((m) => ({
      default: m.InventoryOpsPage,
    })),
  { loading: () => <LoadingPage />, ssr: false },
);

/**
 * Inventory & Operations Analytics – admin/superAdmin only.
 */
export default function ReportsAnalyticsInventory() {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.REPORTS_INVENTORY}>
      <FeaturePageGuard feature={Feature.ANALYTICS_ADVANCED}>
        <AuthGuardWithWorkspace roles={["admin", "superAdmin"]}>
          <PermissionGate perm="REPORTS.ANALYTICS.VIEW">
            <InventoryOpsPage />
          </PermissionGate>
        </AuthGuardWithWorkspace>
      </FeaturePageGuard>
    </EnvFeaturePageGuard>
  );
}
