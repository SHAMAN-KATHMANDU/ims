import { AuthGuard } from "@/components/auth/auth-guard";
import { EnvFeature, EnvFeaturePageGuard } from "@/features/flags";
import { MediaLibraryPage } from "@/features/media";

/** Tenant media library — authenticated users. */
export default function MediaRoute() {
  return (
    <AuthGuard>
      <EnvFeaturePageGuard envFeature={EnvFeature.MEDIA_UPLOAD}>
        <MediaLibraryPage />
      </EnvFeaturePageGuard>
    </AuthGuard>
  );
}
