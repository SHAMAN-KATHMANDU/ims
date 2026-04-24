import { AuthGuard } from "@/components/auth/auth-guard";
import { EnvFeature, EnvFeaturePageGuard } from "@/features/flags";
import { PermissionGate } from "@/features/permissions";
import { MediaLibraryPage } from "@/features/media";

/** Tenant media library — authenticated users. */
export default function MediaRoute() {
  return (
    <AuthGuard>
      <EnvFeaturePageGuard envFeature={EnvFeature.MEDIA_UPLOAD}>
        <PermissionGate perm="WEBSITE.MEDIA.VIEW">
          <MediaLibraryPage />
        </PermissionGate>
      </EnvFeaturePageGuard>
    </AuthGuard>
  );
}
