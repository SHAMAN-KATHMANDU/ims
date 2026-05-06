import { AuthGuard } from "@/components/auth/auth-guard";
import { EnvFeature, EnvFeaturePageGuard } from "@/features/flags";
import { PermissionGate } from "@/features/permissions";
import { ContentHub } from "@/features/content";

export const metadata = { title: "Content" };

/**
 * Content Hub — the CMS-mode landing page. Discovery layer over every
 * content type (pages, blog, products, media, …). Gated by the
 * TENANT_WEBSITES env flag and the WEBSITE module permission so it
 * matches the existing site-editor surface.
 */
export default function ContentRoute() {
  return (
    <AuthGuard roles={["admin", "superAdmin"]}>
      <EnvFeaturePageGuard envFeature={EnvFeature.TENANT_WEBSITES}>
        <PermissionGate perm="WEBSITE.PAGES.VIEW">
          <ContentHub />
        </PermissionGate>
      </EnvFeaturePageGuard>
    </AuthGuard>
  );
}
