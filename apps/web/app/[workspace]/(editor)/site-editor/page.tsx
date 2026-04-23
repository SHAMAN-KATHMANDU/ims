"use client";

import dynamic from "next/dynamic";
import {
  EnvFeaturePageGuard,
  TenantWebsitePageGuard,
  EnvFeature,
} from "@/features/flags";
import { LoadingPage } from "@/components/layout/loading-page";

const SiteEditorPage = dynamic(
  () =>
    import("@/features/tenant-site/site-editor/SiteEditorPage").then((m) => ({
      default: m.SiteEditorPage,
    })),
  { loading: () => <LoadingPage />, ssr: false },
);

/**
 * Full-screen Webflow-style block editor.
 * Lives outside (admin) so it renders without the sidebar/topbar.
 * Opened via target="_blank" from the dashboard nav / Website Settings.
 */
export default function SiteEditorRoute() {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.TENANT_WEBSITES}>
      <TenantWebsitePageGuard>
        <SiteEditorPage fullScreen />
      </TenantWebsitePageGuard>
    </EnvFeaturePageGuard>
  );
}
