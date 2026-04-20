import {
  EnvFeaturePageGuard,
  TenantWebsitePageGuard,
  EnvFeature,
} from "@/features/flags";
import { SiteEditorPage } from "@/features/tenant-site/site-editor/SiteEditorPage";

export const metadata = { title: "Site Designer" };

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
