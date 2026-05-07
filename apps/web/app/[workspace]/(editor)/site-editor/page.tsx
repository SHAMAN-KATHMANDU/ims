"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
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
 *
 * The `[workspace]` route param is the per-tenant slug — passing it as
 * `tenantId` namespaces the localStorage draft key in `useDraftRecovery`,
 * so two tenants in the same browser don't see each other's unsaved drafts.
 */
export default function SiteEditorRoute() {
  const params = useParams<{ workspace: string }>();
  const workspace = params?.workspace ?? "";

  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.TENANT_WEBSITES}>
      <TenantWebsitePageGuard>
        <SiteEditorPage tenantId={workspace} />
      </TenantWebsitePageGuard>
    </EnvFeaturePageGuard>
  );
}
