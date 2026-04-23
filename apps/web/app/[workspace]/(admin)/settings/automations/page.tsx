"use client";

import dynamic from "next/dynamic";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { EnvFeaturePageGuard, EnvFeature } from "@/features/flags";
import { LoadingPage } from "@/components/layout/loading-page";

const AutomationsHubPage = dynamic(
  () =>
    import("@/features/automation").then((m) => ({
      default: m.AutomationsHubPage,
    })),
  { loading: () => <LoadingPage />, ssr: false },
);

/** Entry point: explains event automations vs deal pipeline rules (no API calls). */
export default function AutomationsOverviewPage() {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.SETTINGS}>
      <AuthGuard
        roles={["admin", "superAdmin"]}
        unauthorizedPath={WORKSPACE_ROOT}
      >
        <AutomationsHubPage />
      </AuthGuard>
    </EnvFeaturePageGuard>
  );
}
